(define-data-var total-collateral uint u0)
(define-data-var total-borrowed uint u0)

(define-map collateral
    { user: principal }
    { amount: uint }
)

(define-map borrowed
    { user: principal, token: uint }
    { amount: uint }
)

(define-map user-borrowed-total
    { user: principal }
    { amount: uint }
)

;; Dynamic token registry
(define-map token-codes
    { token: (string-ascii 16) }
    { code: uint }
)

(define-map code-to-token
    { code: uint }
    { token: (string-ascii 16) }
)

(define-map token-meta
    { token: (string-ascii 16) }
    { chain: uint, apy-bps: uint, liquidity: uint, status: uint }
)

(define-data-var next-token-code uint u1)
(define-data-var admin (optional principal) none)

(define-constant err-non-positive u100)
(define-constant err-insufficient-funds u101)
(define-constant err-not-evm u102)
(define-constant err-over-repay u103)
(define-constant err-unsupported-token u104)
(define-constant err-not-admin u105)
(define-constant err-token-exists u106)
(define-constant err-token-missing u107)

;; Risk and rate constants (dummy/fixed for MVP)
(define-constant LIQ_THRESHOLD_BPS u800) ;; 80%
(define-constant BORROW_APY_BPS u800)   ;; 8.00%

;; Simple enums for UI mapping
(define-constant STATUS_AVAILABLE u1)
(define-constant STATUS_COMING_SOON u2)
(define-constant CHAIN_ETH u1)
(define-constant CHAIN_BASE u2)
(define-constant CHAIN_BTC u3)

;; Whitelisted borrowable tokens -> small integer codes (safer map key)
;; Codes are assigned dynamically via registry

(define-read-only (is-supported-token (token-id (string-ascii 16)))
    (> (get code (default-to {code: u0} (map-get? token-codes {token: token-id}))) u0)
)

(define-read-only (token-code-of (token-id (string-ascii 16)))
    (get code (default-to {code: u0} (map-get? token-codes {token: token-id})))
)

(define-read-only (is-admin (who principal))
    (let ((a (var-get admin)))
        (and (is-some a) (is-eq who (unwrap-panic a)))
    )
)

(define-public (init-admin)
    (let ((a (var-get admin)))
        (begin
            (asserts! (is-none a) (err err-not-admin))
            (var-set admin (some tx-sender))
            (ok true)
        )
    )
)

(define-public (add-token (token-id (string-ascii 16)) (chain uint) (apy-bps uint) (liquidity uint) (status uint))
    (let ((a (var-get admin))
          (existing (get code (default-to {code: u0} (map-get? token-codes {token: token-id})))))
        (begin
            (asserts! (and (is-some a) (is-eq tx-sender (unwrap-panic a))) (err err-not-admin))
            (asserts! (is-eq existing u0) (err err-token-exists))
            (let ((code (var-get next-token-code)))
                (map-set token-codes {token: token-id} {code: code})
                (map-set code-to-token {code: code} {token: token-id})
                (map-set token-meta {token: token-id} {chain: chain, apy-bps: apy-bps, liquidity: liquidity, status: status})
                (var-set next-token-code (+ code u1))
                (print {event: "token-added", token: token-id, code: code})
                (ok code)
            )
        )
    )
)

(define-public (set-token-meta (token-id (string-ascii 16)) (chain uint) (apy-bps uint) (liquidity uint) (status uint))
    (let ((a (var-get admin))
          (code (get code (default-to {code: u0} (map-get? token-codes {token: token-id})))))
        (begin
            (asserts! (and (is-some a) (is-eq tx-sender (unwrap-panic a))) (err err-not-admin))
            (asserts! (> code u0) (err err-token-missing))
            (map-set token-meta {token: token-id} {chain: chain, apy-bps: apy-bps, liquidity: liquidity, status: status})
            (print {event: "token-updated", token: token-id, code: code})
            (ok true)
        )
    )
)

(define-read-only (contract-principal)
    (as-contract tx-sender)
)

(define-read-only (get-collateral (user principal))
    (get amount (default-to {amount: u0} (map-get? collateral {user: user})))
)

(define-read-only (get-total-collateral)
    (var-get total-collateral)
)

(define-read-only (get-borrowed (user principal) (token-id (string-ascii 16)))
    (let ((code (token-code-of token-id)))
        (if (> code u0)
            (get amount (default-to {amount: u0} (map-get? borrowed {user: user, token: code})))
            u0))
)

(define-read-only (get-borrowed-total (user principal))
    ;; (default-to u0 
    (get amount (default-to {amount: u0} (map-get? user-borrowed-total {user: user})))
    ;; )
)

(define-read-only (get-total-borrowed)
    (var-get total-borrowed)
)

(define-read-only (get-liquidation-threshold-bps)
    LIQ_THRESHOLD_BPS
)

(define-read-only (get-borrow-apy-bps)
    BORROW_APY_BPS
)

(define-read-only (get-portfolio (user principal))
    {
        collateral: (get-collateral user),
        borrowed: (get-borrowed-total user),
        liq-threshold-bps: (get-liquidation-threshold-bps),
        borrow-apy-bps: (get-borrow-apy-bps)
    }
)

(define-public (deposit-collateral (amount uint))
    (begin
    (asserts! (> amount u0) (err err-non-positive))
        (try! (stx-transfer? amount tx-sender (contract-principal)))
        (let
            (
                (prev (get-collateral tx-sender))
                (new-amt (+ prev amount))
            )
        (map-set collateral {user: tx-sender} {amount: new-amt})
        (var-set total-collateral (+ (var-get total-collateral) amount))
        (print {event: "deposit", user: tx-sender, amount: amount, balance: new-amt})
        (ok new-amt)
        )
    )
)

(define-public (withdraw-collateral (amount uint))
    (let ((prev (get-collateral tx-sender))
          (borrowed-total (get-borrowed-total tx-sender)))
        (begin
            (asserts! (> amount u0) (err err-non-positive))
            ;; MVP rule: block withdrawals while any borrowed balance exists
            (asserts! (is-eq borrowed-total u0) (err err-insufficient-funds))
            (asserts! (>= prev amount) (err err-insufficient-funds))
            (try! (stx-transfer? amount (contract-principal) tx-sender))
            (let ((new-amt (- prev amount)))
                (map-set collateral {user: tx-sender} {amount: new-amt})
                (var-set total-collateral (- (var-get total-collateral) amount))
                (print {event: "withdraw", user: tx-sender, amount: amount, balance: new-amt})
                (ok new-amt)
            )
        )
    )
)

(define-public (request-borrow (token-id (string-ascii 16)) (amount uint) (evm-opt (optional (buff 20))))
        (let ((code (token-code-of token-id))
                 (prev (get amount (default-to {amount: u0} (map-get? borrowed {user: tx-sender, token: code}))))
                 (prev-total (get-borrowed-total tx-sender))
                 (evm-rec (if (is-some evm-opt)
                                            (unwrap-panic evm-opt)
                                            0x0000000000000000000000000000000000000000)))
        (begin
            (asserts! (> code u0) (err err-unsupported-token))
            (asserts! (> amount u0) (err err-non-positive))
            (let ((new (+ prev amount))
                  (new-total (+ prev-total amount)))
                (map-set borrowed {user: tx-sender, token: code} {amount: new})
                (map-set user-borrowed-total {user: tx-sender} {amount: new-total})
                (var-set total-borrowed (+ (var-get total-borrowed) amount))
                (print {
                    event: "borrow-request",
                    user: tx-sender,
                    token-id: token-id,
                                        amount: amount,
                                        evm-recipient: evm-rec
                })
                (ok true)
            )
        )
    )
)

;; Borrow Market: fixed metadata for known tokens
(define-read-only (get-borrow-token-meta (token-id (string-ascii 16)))
    (let ((m (map-get? token-meta {token: token-id})))
        (if (is-some m)
            (let ((mm (unwrap-panic m)))
                { token: token-id, chain: (get chain mm), apy-bps: (get apy-bps mm), liquidity: (get liquidity mm), status: (get status mm) })
            { token: token-id, chain: CHAIN_BASE, apy-bps: u0, liquidity: u0, status: STATUS_COMING_SOON }))
)

(define-public (signal-repay (token-id (string-ascii 16)) (amount uint))
    (let ((code (token-code-of token-id))
          (prev (get amount (default-to {amount: u0} (map-get? borrowed {user: tx-sender, token: code}))))
          (prev-total (get-borrowed-total tx-sender)))
        (begin
            (asserts! (> code u0) (err err-unsupported-token))
            (asserts! (> amount u0) (err err-non-positive))
            (asserts! (>= prev amount) (err err-over-repay))
            (let ((new (- prev amount))
                  (new-total (- prev-total amount)))
                (map-set borrowed {user: tx-sender, token: code} {amount: new})
                (map-set user-borrowed-total {user: tx-sender} {amount: new-total})
                (var-set total-borrowed (- (var-get total-borrowed) amount))
                (print {
                    event: "repay-request",
                    user: tx-sender,
                    token-id: token-id,
                    amount: amount
                })
                (ok true)
            )
        )
    )
)
;; HayyProtocol Collateral Contract v1
;; For Stacks <-> Sui Cross-Chain Lending
;; This contract ONLY manages STX collateral on Stacks
;; All borrowing/lending happens on Sui chain

(define-data-var total-collateral uint u0)
(define-data-var admin (optional principal) none)

;; Collateral tracking per user
(define-map collateral
    { user: principal }
    {
        amount: uint,
        sui-address: (string-ascii 66) ;; Store user's Sui address (0x...)
    }
)

;; Error codes
(define-constant err-non-positive u100)
(define-constant err-insufficient-funds u101)
(define-constant err-not-admin u105)

;; ========================================
;; ADMIN FUNCTIONS
;; ========================================

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

;; ========================================
;; READ-ONLY FUNCTIONS
;; ========================================

(define-read-only (contract-principal)
    (as-contract tx-sender)
)

(define-read-only (get-collateral (user principal))
    (get amount (default-to {amount: u0, sui-address: ""} (map-get? collateral {user: user})))
)

(define-read-only (get-sui-address (user principal))
    (get sui-address (default-to {amount: u0, sui-address: ""} (map-get? collateral {user: user})))
)

(define-read-only (get-total-collateral)
    (var-get total-collateral)
)

(define-read-only (get-portfolio (user principal))
    {
        collateral: (get-collateral user),
        total-protocol: (get-total-collateral)
    }
)

;; ========================================
;; PUBLIC FUNCTIONS (User-facing)
;; ========================================

;; Deposit STX as collateral
;; User must provide their Sui address where they want to borrow
(define-public (deposit-collateral (amount uint) (sui-address (string-ascii 66)))
    (begin
        (asserts! (> amount u0) (err err-non-positive))
        (asserts! (> (len sui-address) u0) (err err-non-positive)) ;; Ensure Sui address is provided
        (try! (stx-transfer? amount tx-sender (contract-principal)))
        (let
            (
                (prev (get-collateral tx-sender))
                (new-amt (+ prev amount))
            )
            (map-set collateral {user: tx-sender} {amount: new-amt, sui-address: sui-address})
            (var-set total-collateral (+ (var-get total-collateral) amount))
            (print {
                event: "collateral-deposited",
                user: tx-sender,
                amount: amount,
                new-balance: new-amt,
                sui-address: sui-address,
                block-height: block-height
            })
            (ok new-amt)
        )
    )
)

;; Signal withdrawal request
;; Relayer will verify on Sui that user has no debt before unlocking
(define-public (request-withdraw (amount uint))
    (let ((current-collateral (get-collateral tx-sender)))
        (begin
            (asserts! (> amount u0) (err err-non-positive))
            (asserts! (>= current-collateral amount) (err err-insufficient-funds))
            (print {
                event: "withdraw-requested",
                user: tx-sender,
                amount: amount,
                current-collateral: current-collateral,
                block-height: block-height
            })
            (ok true)
        )
    )
)

;; ========================================
;; ADMIN FUNCTIONS (Relayer-only)
;; ========================================

;; Unlock collateral after verification on Sui
;; Called by relayer after confirming user has no debt on Sui
(define-public (admin-unlock-collateral (user principal) (amount uint))
    (let ((a (var-get admin))
          (prev (get-collateral user)))
        (begin
            (asserts! (and (is-some a) (is-eq tx-sender (unwrap-panic a))) (err err-not-admin))
            (asserts! (> amount u0) (err err-non-positive))
            (asserts! (>= prev amount) (err err-insufficient-funds))
            (try! (as-contract (stx-transfer? amount (contract-principal) user)))
            (let ((new-amt (- prev amount)))
                (map-set collateral {user: user} {amount: new-amt, sui-address: (get-sui-address user)})
                (var-set total-collateral (- (var-get total-collateral) amount))
                (print {
                    event: "collateral-unlocked",
                    user: user,
                    amount: amount,
                    new-balance: new-amt,
                    unlocked-by: tx-sender,
                    block-height: block-height
                })
                (ok new-amt)
            )
        )
    )
)

;; Emergency admin withdrawal (only if needed)
(define-public (admin-emergency-withdraw (recipient principal) (amount uint))
    (let ((a (var-get admin)))
        (begin
            (asserts! (and (is-some a) (is-eq tx-sender (unwrap-panic a))) (err err-not-admin))
            (asserts! (> amount u0) (err err-non-positive))
            (try! (as-contract (stx-transfer? amount (contract-principal) recipient)))
            (print {
                event: "emergency-withdrawal",
                recipient: recipient,
                amount: amount,
                by: tx-sender,
                block-height: block-height
            })
            (ok true)
        )
    )
)

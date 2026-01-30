(define-data-var total-lend uint u0)

(define-map lending
    { user: principal }
    { amount: uint }
)

(define-constant LEND_APY_BPS u500) ;; 5.00% APY in basis points

(define-constant err-non-positive u200)
(define-constant err-insufficient-funds u201)

(define-read-only (contract-principal)
    (as-contract tx-sender)
)

(define-read-only (get-lend-balance (user principal))
        (get amount (default-to {amount: u0} (map-get? lending {user: user})))
)

(define-read-only (get-total-lend)
    (var-get total-lend)
)

(define-read-only (get-lend-apy-bps)
    LEND_APY_BPS
)

(define-public (deposit-lend-collateral (amount uint))
    (begin
    (asserts! (> amount u0) (err err-non-positive))
        (try! (stx-transfer? amount tx-sender (contract-principal)))
        (let
            (
                (prev (get-lend-balance tx-sender))
                (new-amt (+ prev amount))
            )
        (map-set lending {user: tx-sender} {amount: new-amt})
        (var-set total-lend (+ (var-get total-lend) amount))
        (print {event: "deposit", user: tx-sender, amount: amount, balance: new-amt})
        (ok new-amt)
        )
    )
)

(define-public (withdraw-lend-collateral (amount uint))
    (let ((prev (get-lend-balance tx-sender)))
        (begin
            (asserts! (> amount u0) (err err-non-positive))
            (asserts! (>= prev amount) (err err-insufficient-funds))
            (try! (stx-transfer? amount (contract-principal) tx-sender))
            (let ((new-amt (- prev amount)))
                (map-set lending {user: tx-sender} {amount: new-amt})
                (var-set total-lend (- (var-get total-lend) amount))
                (print {event: "lend-withdraw", user: tx-sender, amount: amount, balance: new-amt})
                (ok new-amt)
            )
        )
    )
)
# 🎨 Visual Guide - Collateral Status UI

## User Interface Flow

### 1️⃣ Initial State - Before Deposit
```
┌─────────────────────────────────────────┐
│  Stacks Lending                         │
├─────────────────────────────────────────┤
│  Deposit STX Collateral                 │
│  ┌───────────────────────────────────┐  │
│  │ Amount: [________] STX            │  │
│  │ Sui Address: 0x1234...5678        │  │
│  └───────────────────────────────────┘  │
│  [Deposit Collateral] 🔵               │
└─────────────────────────────────────────┘
```

### 2️⃣ After Clicking Deposit
```
🔔 Toast: "🔄 Transaction Submitted"
        "Please confirm in your wallet..."
```

### 3️⃣ Transaction Confirmed → Banner Appears
```
┌─────────────────────────────────────────────────┐
│ ⏳ Processing Your Deposit                      │
│ Waiting for transaction to be detected...      │
│ Est. 10-30 seconds                              │
│ ▓▓▓▓▓▓▓░░░░░░░░░░░░░  40%                     │
│ Confirming transaction...                      │
└─────────────────────────────────────────────────┘
```
🔔 Toast: "✅ Transaction Confirmed!"

### 4️⃣ Relayer Detected → Registering
```
┌─────────────────────────────────────────────────┐
│ ⏳ Processing Your Deposit                      │
│ Registering collateral on Sui blockchain...    │
│ Est. 15-45 seconds                              │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░  85%                     │
│ Registering on Sui...                          │
└─────────────────────────────────────────────────┘
```

### 5️⃣ Registration Complete! 🎉
```
┌─────────────────────────────────────────────────┐
│ ✅ Ready to Borrow!  ⚡                         │
│ Collateral successfully registered!            │
│ You can now borrow on Sui.                     │
│                                                 │
│ 💰 10.50 STX    |    $158.50 borrow power     │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  100%                    │
└─────────────────────────────────────────────────┘
```
🔔 Toast: "🎉 Ready to Borrow!"
       "Your collateral is registered."

### 6️⃣ Auto-Hide (5 seconds later)
```
┌─────────────────────────────────────────┐
│  Stacks Lending                         │
├─────────────────────────────────────────┤
│  ✅ Collateral: 10.50 STX               │
│  💪 Borrow Power: $158.50               │
│                                         │
│  [Withdraw] [Borrow on Sui] 🚀         │
└─────────────────────────────────────────┘
```

---

## Color Scheme

### 🔵 Pending State (Blue)
- Background: `bg-blue-50 dark:bg-blue-950`
- Border: `border-blue-200 dark:border-blue-800`
- Icon: `Clock` with pulse animation
- Progress bar: Blue gradient

### 🟢 Success State (Green)
- Background: `bg-green-50 dark:bg-green-950`
- Border: `border-green-200 dark:border-green-800`
- Icon: `Zap` + `CheckCircle`
- Badge: Shows collateral amount

### 🔴 Error State (Red)
- Background: `bg-red-50 dark:bg-red-950`
- Border: `border-red-200 dark:border-red-800`
- Icon: `AlertTriangle`
- Shows error message + retry button

---

## Animation Timeline

```
0s    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ User clicks "Deposit"
      │ Toast: Transaction Submitted
      │ Wallet popup opens
      
5s    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ User confirms tx
      │ Banner appears
      │ Progress: 0% → 50%
      │ Status: "Confirming transaction..."
      
15s   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Relayer detects event
      │ Progress: 50% → 90%
      │ Status: "Registering on Sui..."
      
45s   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Registration complete!
      │ Progress: 100%
      │ Banner: Green ✅
      │ Toast: Ready to Borrow!
      
50s   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      │ Banner auto-hides
      │ User can now borrow
```

---

## Mobile Responsive

### Desktop (> 768px)
```
┌────────────────────────────────────────┐
│ ⏳ Processing Your Deposit             │
│ Waiting for transaction...             │
│ ▓▓▓▓▓▓▓▓▓░░░░░░░░░  50%               │
│ Confirming...                          │
└────────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────────────┐
│ ⏳ Processing...     │
│ Waiting...           │
│ ▓▓▓▓░░░░  50%        │
└──────────────────────┘
```

---

## Dark Mode Support

### Light Mode
- Background: Blue/Green 50 variants
- Text: 900 variants
- Borders: 200 variants

### Dark Mode
- Background: Blue/Green 950 variants
- Text: 100/200/300 variants
- Borders: 800 variants

---

## Accessibility

- ♿ **Screen Readers**: Status messages read aloud
- ⌨️ **Keyboard**: Can dismiss banner with ESC
- 🎨 **High Contrast**: Works in high contrast mode
- 📱 **Touch**: Large touch targets (min 44x44px)

---

## Technical Animation

### Progress Bar
```typescript
// Animates from 0% → 90% while pending
// Jumps to 100% when registered

useEffect(() => {
  const interval = setInterval(() => {
    setProgress(prev => {
      if (prev >= 90) return 90; // Cap at 90%
      return prev + 2; // +2% every 500ms
    });
  }, 500);
  
  return () => clearInterval(interval);
}, [status]);
```

### Slide-in Animation
```css
.animate-in {
  animation: slideInFromTop 0.3s ease-out;
}

@keyframes slideInFromTop {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

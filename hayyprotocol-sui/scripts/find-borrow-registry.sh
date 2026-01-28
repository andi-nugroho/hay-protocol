#!/bin/bash

# Find BorrowRegistry ID from deployed package
PACKAGE_ID="$1"

if [ -z "$PACKAGE_ID" ]; then
    echo "Usage: $0 <PACKAGE_ID>"
    echo "Example: $0 0x9b5b097f327b34ef233c2f02370e7c801224edecd02a7e443c227bfdb053d7ff"
    exit 1
fi

echo "🔍 Searching for BorrowRegistry from package: $PACKAGE_ID"
echo ""

# Method 1: Try with sui client objects and filter
echo "Method 1: Checking owned/shared objects..."
REGISTRY_ID=$(sui client objects --json 2>/dev/null | jq -r --arg pkg "$PACKAGE_ID" '.[] | select(.data.type != null and (.data.type | tostring | contains($pkg) and contains("BorrowRegistry"))) | .data.objectId' 2>/dev/null | head -1)

if [ ! -z "$REGISTRY_ID" ] && [ "$REGISTRY_ID" != "null" ]; then
    echo "✅ Found BorrowRegistry: $REGISTRY_ID"
    exit 0
fi

# Method 2: Try with dynamic fields query
echo "Method 1 failed, trying Method 2: Query recent transactions..."
echo ""
echo "⚠️  Could not find BorrowRegistry automatically."
echo ""
echo "📋 Manual steps:"
echo "1. Open: https://suiscan.xyz/testnet/object/$PACKAGE_ID"
echo "2. Click 'Transactions' tab"
echo "3. Click first transaction (publish)"
echo "4. Look for 'BorrowRegistry' in Object Changes"
echo "5. Copy the Object ID"
echo ""
echo "Or run: sui client objects | grep -i 'BorrowRegistry'"

exit 1

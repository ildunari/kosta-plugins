# StoreKit 2 Guide

Implement on-device purchases and subscriptions using StoreKit 2.

## Setup
- Create products in App Store Connect.
- Load with `Product.products(for:)`.
- Purchase with `product.purchase()` and finish transactions.
- Observe `Transaction.updates`.

## Testing
- Use StoreKit testing in Xcode.
- Validate price display, restore purchases, and upgrade/downgrade flows.

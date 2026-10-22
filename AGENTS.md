# Architecture rules

- Field receipt capture stores only individually reviewed, paid daily expenses in the existing expenses table; formal invoice obligations need their own future model to avoid mixing debt and cash outlay.
- Use saveExpenseWithReceipt for expense attachment writes so failed inserts trigger cleanup consistently.
- Receipt file acceptance mirrors the private receipts bucket's format and size constraints; keep validation and tests aligned with its configuration.
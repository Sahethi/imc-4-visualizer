# IMC Prosperity 4 Visualizer

A visualizer for [IMC Prosperity 4](https://prosperity.imc.com/) algorithms, adapted from [jmerle's IMC Prosperity 2 Visualizer](https://github.com/jmerle/imc-prosperity-2-visualizer).

Supports **Round 1** and **Round 2** products: `ASH_COATED_OSMIUM` and `INTARIAN_PEPPER_ROOT` (position limit: 80 each).

---

## Using the hosted version

The easiest way to use this visualizer is to open it directly in your browser — no installation needed.

1. Run your strategy through the backtester (Rust or Python `prosperity4bt`) to generate a log file.
2. Open the visualizer in your browser.
3. Paste or upload your log file.
4. Explore the PnL chart, position chart, order depth, trades, and per-symbol breakdowns.

---

## Running locally

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [pnpm](https://pnpm.io/) — install with:
  ```
  npm install -g pnpm
  ```

### Steps

1. **Clone the repo**
   ```bash
   git clone https://github.com/Sahethi/imc-4-visualizer.git
   cd imc-4-visualizer
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start the dev server**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Build for production** (optional)
   ```bash
   pnpm build
   pnpm preview
   ```
   The built files will be in the `dist/` folder.

---

## Loading a log file

The visualizer reads the output logs produced by the backtester. To generate one:

**Python backtester (`prosperity4bt`)**
```bash
python3 -m prosperity4bt your_strategy.py 2 --data path/to/resources
```
The log file is saved in a `backtests/` folder.

**Rust backtester**
```bash
cargo run --release -- --trader your_strategy.py --dataset round2 --day=-1
```

Once you have a log file, either:
- Paste the contents directly into the visualizer's text box, or
- Use the file upload button to load it from disk.

---

## What you can see

| Panel | Description |
|-------|-------------|
| PnL Chart | Profit & loss over time across all products |
| Position Chart | Position as % of limit per product |
| Product Price Chart | Mid price, bid/ask levels, and your orders |
| Order Depth Table | Full bid/ask ladder at any timestamp (click a timestamp to open) |
| Trade Tape | Market trades and your fills |
| Volume Chart | Traded volume per timestamp |

// Tax engine for ITR-1 — supports AY 2021-22 through AY 2026-27
// Old regime slabs are unchanged across all these years.
// New regime (Sec 115BAC) changed at AY 2023-24, AY 2024-25, AY 2025-26.
// Verified against Finance Act 2020/2023/2024/2025 and incometax.gov.in notifications
// as of Sep 2026. Re-verify before using for any future AY not listed here.

// ---- Year-wise NEW REGIME config ----
const NEW_REGIME_CONFIG = {
  // AY 2021-22 and AY 2022-23 — original Section 115BAC slabs, no standard deduction
  '2021-22': {
    slabs: [
      { upto: 250000,  rate: 0 },
      { upto: 500000,  rate: 0.05 },
      { upto: 750000,  rate: 0.10 },
      { upto: 1000000, rate: 0.15 },
      { upto: 1250000, rate: 0.20 },
      { upto: 1500000, rate: 0.25 },
      { upto: Infinity, rate: 0.30 }
    ],
    stdDeduction: 0,
    rebateLimit: 500000,
    rebateMax: 12500
  },
  '2022-23': {
    slabs: [
      { upto: 250000,  rate: 0 },
      { upto: 500000,  rate: 0.05 },
      { upto: 750000,  rate: 0.10 },
      { upto: 1000000, rate: 0.15 },
      { upto: 1250000, rate: 0.20 },
      { upto: 1500000, rate: 0.25 },
      { upto: Infinity, rate: 0.30 }
    ],
    stdDeduction: 0,
    rebateLimit: 500000,
    rebateMax: 12500
  },
  // AY 2023-24 — Budget 2023 revamp: wider slabs, std deduction introduced
  '2023-24': {
    slabs: [
      { upto: 300000,  rate: 0 },
      { upto: 600000,  rate: 0.05 },
      { upto: 900000,  rate: 0.10 },
      { upto: 1200000, rate: 0.15 },
      { upto: 1500000, rate: 0.20 },
      { upto: Infinity, rate: 0.30 }
    ],
    stdDeduction: 50000,
    rebateLimit: 700000,
    rebateMax: 25000
  },
  // AY 2024-25
  '2024-25': {
    slabs: [
      { upto: 300000,  rate: 0 },
      { upto: 700000,  rate: 0.05 },
      { upto: 1000000, rate: 0.10 },
      { upto: 1200000, rate: 0.15 },
      { upto: 1500000, rate: 0.20 },
      { upto: Infinity, rate: 0.30 }
    ],
    stdDeduction: 50000,
    rebateLimit: 700000,
    rebateMax: 25000
  },
  // AY 2025-26 — std deduction raised to 75,000
  '2025-26': {
    slabs: [
      { upto: 300000,  rate: 0 },
      { upto: 700000,  rate: 0.05 },
      { upto: 1000000, rate: 0.10 },
      { upto: 1200000, rate: 0.15 },
      { upto: 1500000, rate: 0.20 },
      { upto: Infinity, rate: 0.30 }
    ],
    stdDeduction: 75000,
    rebateLimit: 700000,
    rebateMax: 25000
  },
  // AY 2026-27 — exemption raised to 4L, 7 slabs, rebate raised to 60,000 up to 12L + marginal relief
  '2026-27': {
    slabs: [
      { upto: 400000,  rate: 0 },
      { upto: 800000,  rate: 0.05 },
      { upto: 1200000, rate: 0.10 },
      { upto: 1600000, rate: 0.15 },
      { upto: 2000000, rate: 0.20 },
      { upto: 2400000, rate: 0.25 },
      { upto: Infinity, rate: 0.30 }
    ],
    stdDeduction: 75000,
    rebateLimit: 1200000,
    rebateMax: 60000,
    marginalRelief: true
  }
};

// ---- OLD REGIME config: unchanged across all these years ----
const OLD_REGIME_CONFIG = {
  slabs: [
    { upto: 250000,  rate: 0 },
    { upto: 500000,  rate: 0.05 },
    { upto: 1000000, rate: 0.20 },
    { upto: Infinity, rate: 0.30 }
  ],
  stdDeduction: 50000,
  rebateLimit: 500000,
  rebateMax: 12500
};

// Normalizes AY strings like "2026", "2026-27", "2026-2027" to the "YYYY-YY" key used above.
function normalizeAY(ayRaw) {
  const s = (ayRaw || '').toString().trim();
  const match4 = s.match(/^(\d{4})$/);
  if (match4) {
    const startYear = parseInt(match4[1], 10);
    const endYY = ((startYear + 1) % 100).toString().padStart(2, '0');
    return `${startYear}-${endYY}`;
  }
  const matchRange = s.match(/^(\d{4})-(\d{2,4})$/);
  if (matchRange) {
    const startYear = matchRange[1];
    const endPart = matchRange[2];
    const endYY = endPart.length === 4 ? endPart.slice(-2) : endPart;
    return `${startYear}-${endYY}`;
  }
  return s;
}

function getRegimeConfig(ayKey, oldRegime) {
  if (oldRegime) return OLD_REGIME_CONFIG;
  const config = NEW_REGIME_CONFIG[ayKey];
  if (!config) return null; // unsupported year
  return config;
}

function calcSlabTax(totalIncome, slabs) {
  let tax = 0;
  let lower = 0;
  for (const slab of slabs) {
    if (totalIncome > lower) {
      const taxableInSlab = Math.min(totalIncome, slab.upto) - lower;
      tax += taxableInSlab * slab.rate;
      lower = slab.upto;
    } else {
      break;
    }
  }
  return Math.round(tax);
}

// Rebate u/s 87A, generic across years using per-year config
function calcRebate87A(totalIncome, taxBeforeRebate, config) {
  if (totalIncome <= config.rebateLimit) {
    return Math.min(taxBeforeRebate, config.rebateMax);
  }
  if (config.marginalRelief && taxBeforeRebate > (totalIncome - config.rebateLimit)) {
    return taxBeforeRebate - (totalIncome - config.rebateLimit);
  }
  return 0;
}

// Cess = 4% of (Tax after Rebate)
function calcCess(taxAfterRebate) {
  return Math.round(taxAfterRebate * 0.04);
}

function computeTaxITR1(parsed) {
  const totalIncome = parsed.income.totalIncome;
  const oldRegime = parsed.filing.oldRegime;
  const ayKey = normalizeAY(parsed.filing.assessmentYear);

  const config = getRegimeConfig(ayKey, oldRegime);

  if (!config) {
    return {
      error: true,
      message: `Assessment Year ${ayKey || '(unknown)'} is not supported by this tool. ` +
               `Supported: AY 2021-22 to AY 2026-27. Please verify slab rates manually for this year.`
    };
  }

  const slabTax = calcSlabTax(totalIncome, config.slabs);
  const rebate = calcRebate87A(totalIncome, slabTax, config);
  const taxAfterRebate = Math.max(0, slabTax - rebate);
  const cess = calcCess(taxAfterRebate);
  const grossTaxLiability = taxAfterRebate + cess;
  const relief89 = parsed.taxComp.relief89 || 0;
  const netTaxLiability = Math.max(0, grossTaxLiability - relief89);

  const totalTaxesPaid = parsed.taxPaid.total;
  const totalTaxPlusInterest = netTaxLiability + (parsed.taxComp.interestPayable || 0);

  const refundOrPayable = totalTaxesPaid - totalTaxPlusInterest;

  return {
    assessmentYearUsed: ayKey,
    regimeStdDeduction: config.stdDeduction,
    slabTax,
    rebate,
    taxAfterRebate,
    cess,
    grossTaxLiability,
    relief89,
    netTaxLiability,
    totalTaxPlusInterest,
    totalTaxesPaid,
    refundDue: refundOrPayable > 0 ? refundOrPayable : 0,
    balancePayable: refundOrPayable < 0 ? Math.abs(refundOrPayable) : 0
  };
}

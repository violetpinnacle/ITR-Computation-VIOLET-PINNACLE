// Parses a raw ITR-1 JSON object into a flat, simple structure
// that the tax engine and renderer can use safely.

function safeGet(obj, path, fallback) {
  try {
    const parts = path.split('.');
    let val = obj;
    for (const p of parts) {
      if (val === undefined || val === null) return fallback;
      val = val[p];
    }
    return (val === undefined || val === null) ? fallback : val;
  } catch (e) {
    return fallback;
  }
}

function parseITR1(rawData) {
  const itr1 = rawData.ITR.ITR1;

  const personal = {
    firstName: safeGet(itr1, 'PersonalInfo.AssesseeName.FirstName', ''),
    surName: safeGet(itr1, 'PersonalInfo.AssesseeName.SurNameOrOrgName', ''),
    pan: safeGet(itr1, 'PersonalInfo.PAN', ''),
    dob: safeGet(itr1, 'PersonalInfo.DOB', ''),
    city: safeGet(itr1, 'PersonalInfo.Address.CityOrTownOrDistrict', ''),
    pin: safeGet(itr1, 'PersonalInfo.Address.PinCode', '')
  };

  const filing = {
    assessmentYear: safeGet(itr1, 'Form_ITR1.AssessmentYear', ''),
    filingSection: safeGet(itr1, 'FilingStatus.ReturnFileSec', ''),
    dueDate: safeGet(itr1, 'FilingStatus.ItrFilingDueDate', ''),
    oldRegime: safeGet(itr1, 'FilingStatus.OptOutNewTaxRegime', 'N') === 'Y'
  };

  const income = {
    grossSalary: safeGet(itr1, 'ITR1_IncomeDeductions.GrossSalary', 0),
    allowancesExempt: safeGet(itr1, 'ITR1_IncomeDeductions.AllwncExemptUs10.TotalAllwncExemptUs10', 0),
    netSalary: safeGet(itr1, 'ITR1_IncomeDeductions.NetSalary', 0),
    stdDeduction16ia: safeGet(itr1, 'ITR1_IncomeDeductions.DeductionUs16ia', 0),
    entertainmentAllow16ii: safeGet(itr1, 'ITR1_IncomeDeductions.EntertainmentAlw16ii', 0),
    professionalTax16iii: safeGet(itr1, 'ITR1_IncomeDeductions.ProfessionalTaxUs16iii', 0),
    incomeFromSalary: safeGet(itr1, 'ITR1_IncomeDeductions.IncomeFromSal', 0),
    incomeFromHouseProperty: safeGet(itr1, 'ITR1_IncomeDeductions.TotalIncomeOfHP', 0),
    incomeFromOtherSources: safeGet(itr1, 'ITR1_IncomeDeductions.IncomeOthSrc', 0),
    grossTotalIncome: safeGet(itr1, 'ITR1_IncomeDeductions.GrossTotIncome', 0),
    totalIncome: safeGet(itr1, 'ITR1_IncomeDeductions.TotalIncome', 0)
  };

  const viaRaw = safeGet(itr1, 'ITR1_IncomeDeductions.DeductUndChapVIA', {});
  const deductions = {
    sec80C: viaRaw.Section80C || 0,
    sec80CCC: viaRaw.Section80CCC || 0,
    sec80CCD1: viaRaw.Section80CCDEmployeeOrSE || 0,
    sec80CCD1B: viaRaw.Section80CCD1B || 0,
    sec80CCD2: viaRaw.Section80CCDEmployer || 0,
    sec80D: viaRaw.Section80D || 0,
    sec80DD: viaRaw.Section80DD || 0,
    sec80DDB: viaRaw.Section80DDB || 0,
    sec80E: viaRaw.Section80E || 0,
    sec80EE: viaRaw.Section80EE || 0,
    sec80EEA: viaRaw.Section80EEA || 0,
    sec80EEB: viaRaw.Section80EEB || 0,
    sec80G: viaRaw.Section80G || 0,
    sec80GG: viaRaw.Section80GG || 0,
    sec80GGA: viaRaw.Section80GGA || 0,
    sec80GGC: viaRaw.Section80GGC || 0,
    sec80TTA: viaRaw.Section80TTA || 0,
    sec80TTB: viaRaw.Section80TTB || 0,
    sec80U: viaRaw.Section80U || 0,
    total: viaRaw.TotalChapVIADeductions || 0
  };

  const taxComp = {
    totalTaxPayable: safeGet(itr1, 'ITR1_TaxComputation.TotalTaxPayable', 0),
    rebate87A: safeGet(itr1, 'ITR1_TaxComputation.Rebate87A', 0),
    taxAfterRebate: safeGet(itr1, 'ITR1_TaxComputation.TaxPayableOnRebate', 0),
    cess: safeGet(itr1, 'ITR1_TaxComputation.EducationCess', 0),
    grossTaxLiability: safeGet(itr1, 'ITR1_TaxComputation.GrossTaxLiability', 0),
    relief89: safeGet(itr1, 'ITR1_TaxComputation.Section89', 0),
    netTaxLiability: safeGet(itr1, 'ITR1_TaxComputation.NetTaxLiability', 0),
    interestPayable: safeGet(itr1, 'ITR1_TaxComputation.TotalIntrstPay', 0),
    totalTaxAndInterest: safeGet(itr1, 'ITR1_TaxComputation.TotTaxPlusIntrstPay', 0)
  };

  const taxPaid = {
    tds: safeGet(itr1, 'TaxPaid.TaxesPaid.TDS', 0),
    tcs: safeGet(itr1, 'TaxPaid.TaxesPaid.TCS', 0),
    advanceTax: safeGet(itr1, 'TaxPaid.TaxesPaid.AdvanceTax', 0),
    selfAssessmentTax: safeGet(itr1, 'TaxPaid.TaxesPaid.SelfAssessmentTax', 0),
    total: safeGet(itr1, 'TaxPaid.TaxesPaid.TotalTaxesPaid', 0),
    balancePayable: safeGet(itr1, 'TaxPaid.BalTaxPayable', 0)
  };

  const refund = {
    refundDue: safeGet(itr1, 'Refund.RefundDue', 0)
  };

  return { personal, filing, income, deductions, taxComp, taxPaid, refund };
}

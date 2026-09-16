// Renders the ITR-1 computation sheet into the page.

let _lastParsed = null;
let _lastComputed = null;

function formatCurrency(num) {
  const n = Number(num) || 0;
  return '₹' + n.toLocaleString('en-IN');
}

function formatAadhaar(num) {
  const clean = (num || '').toString().replace(/\D/g, '');
  if (clean.length !== 12) return num || '';
  return clean.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
}

function renderWatermark() {
  if (isPaid()) return '';
  const wmText = 'VIOLET PINNACLE\n(Your Trusted tax & gst partner)\nThiruvariyaru, Thanjavur - 613204\ngmail: violetpinnacle@gmail.com';
  let tiles = '';
  for (let i = 0; i < 18; i++) {
    tiles += `<div class="watermark-text">${wmText}</div>`;
  }
  return `<div class="watermark-layer">${tiles}</div>`;
}

function renderPaymentButton() {
  if (isPaid()) return '';
  return `<button onclick="startPayment(function(){ renderComputationITR1(_lastParsed, _lastComputed); })">Pay ₹${PAYMENT_AMOUNT_RUPEES} to Remove Watermark</button>`;
}

function renderComputationITR1(parsed, computed) {
  const container = document.getElementById('outputSection');
  _lastParsed = parsed;
  _lastComputed = computed;

  if (computed.error) {
    container.innerHTML = `
      <div class="comp-sheet">
        <p style="color:#b00020; font-weight:bold;">${computed.message}</p>
        <div class="no-print" style="margin-top:16px;">
          <button onclick="location.reload()">Upload Another File</button>
        </div>
      </div>
    `;
    return;
  }

  const fullName = (parsed.personal.firstName + ' ' + parsed.personal.surName).trim();
  const regimeLabel = parsed.filing.oldRegime ? 'Old Tax Regime' : 'New Tax Regime';

  container.innerHTML = `
    <div class="comp-sheet">
      ${renderWatermark()}
      <h2>Income Tax Computation Sheet</h2>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>PAN:</strong> ${parsed.personal.pan}</p>
      <p><strong>Aadhaar No.:</strong> ${formatAadhaar(parsed.personal.aadhaar)}</p>
      <p><strong>Assessment Year:</strong> ${parsed.filing.assessmentYear}-${(parseInt(parsed.filing.assessmentYear)+1).toString().slice(-2)}</p>
      <p><strong>Regime:</strong> ${regimeLabel}</p>

      <h3>Income Details</h3>
      <table>
        <tr><td>Gross Salary</td><td class="amount">${formatCurrency(parsed.income.grossSalary)}</td></tr>
        <tr><td>Less: Allowances exempt u/s 10</td><td class="amount">${formatCurrency(parsed.income.allowancesExempt)}</td></tr>
        <tr><td>Net Salary</td><td class="amount">${formatCurrency(parsed.income.netSalary)}</td></tr>
        <tr><td>Less: Standard Deduction u/s 16(ia)</td><td class="amount">${formatCurrency(parsed.income.stdDeduction16ia)}</td></tr>
        <tr><td>Less: Professional Tax u/s 16(iii)</td><td class="amount">${formatCurrency(parsed.income.professionalTax16iii)}</td></tr>
        <tr><td><strong>Income from Salary</strong></td><td class="amount"><strong>${formatCurrency(parsed.income.incomeFromSalary)}</strong></td></tr>
        <tr><td>Income from House Property</td><td class="amount">${formatCurrency(parsed.income.incomeFromHouseProperty)}</td></tr>
        <tr><td>Income from Other Sources</td><td class="amount">${formatCurrency(parsed.income.incomeFromOtherSources)}</td></tr>
        <tr class="total-row"><td>Gross Total Income</td><td class="amount">${formatCurrency(parsed.income.grossTotalIncome)}</td></tr>
      </table>

      <h3>Deductions under Chapter VI-A</h3>
      <table>
        ${renderDeductionRow('Section 80C', parsed.deductions.sec80C)}
        ${renderDeductionRow('Section 80CCD(1B)', parsed.deductions.sec80CCD1B)}
        ${renderDeductionRow('Section 80D', parsed.deductions.sec80D)}
        ${renderDeductionRow('Section 80E', parsed.deductions.sec80E)}
        ${renderDeductionRow('Section 80G', parsed.deductions.sec80G)}
        ${renderDeductionRow('Section 80TTA', parsed.deductions.sec80TTA)}
        ${renderDeductionRow('Section 80TTB', parsed.deductions.sec80TTB)}
        <tr class="total-row"><td>Total Deductions</td><td class="amount">${formatCurrency(parsed.deductions.total)}</td></tr>
      </table>

      <h3>Tax Computation</h3>
      <table>
        <tr><td>Total Income (Taxable)</td><td class="amount">${formatCurrency(parsed.income.totalIncome)}</td></tr>
        <tr><td>Tax on Total Income (as per slab)</td><td class="amount">${formatCurrency(computed.slabTax)}</td></tr>
        <tr><td>Less: Rebate u/s 87A</td><td class="amount">${formatCurrency(computed.rebate)}</td></tr>
        <tr><td>Tax after Rebate</td><td class="amount">${formatCurrency(computed.taxAfterRebate)}</td></tr>
        <tr><td>Add: Health & Education Cess (4%)</td><td class="amount">${formatCurrency(computed.cess)}</td></tr>
        <tr><td>Gross Tax Liability</td><td class="amount">${formatCurrency(computed.grossTaxLiability)}</td></tr>
        <tr><td>Less: Relief u/s 89</td><td class="amount">${formatCurrency(computed.relief89)}</td></tr>
        <tr class="total-row"><td>Net Tax Liability</td><td class="amount">${formatCurrency(computed.netTaxLiability)}</td></tr>
      </table>

      <h3>Taxes Paid</h3>
      <table>
        <tr><td>TDS</td><td class="amount">${formatCurrency(parsed.taxPaid.tds)}</td></tr>
        <tr><td>TCS</td><td class="amount">${formatCurrency(parsed.taxPaid.tcs)}</td></tr>
        <tr><td>Advance Tax</td><td class="amount">${formatCurrency(parsed.taxPaid.advanceTax)}</td></tr>
        <tr><td>Self-Assessment Tax</td><td class="amount">${formatCurrency(parsed.taxPaid.selfAssessmentTax)}</td></tr>
        <tr class="total-row"><td>Total Taxes Paid</td><td class="amount">${formatCurrency(computed.totalTaxesPaid)}</td></tr>
      </table>

      <h3>Final Result</h3>
      <table>
        ${computed.refundDue > 0
          ? `<tr class="total-row"><td>Refund Due</td><td class="amount">${formatCurrency(computed.refundDue)}</td></tr>`
          : `<tr class="total-row"><td>Balance Tax Payable</td><td class="amount">${formatCurrency(computed.balancePayable)}</td></tr>`
        }
      </table>

      <div class="no-print" style="margin-top:24px;">
        ${renderPaymentButton()}
        <button onclick="window.print()">Print / Save as PDF</button>
        <button onclick="location.reload()">Upload Another File</button>
      </div>

      <p style="font-size:0.8rem;color:#888;margin-top:20px;">
        This is an unofficial computation sheet generated for reference purposes only.
        It is not a substitute for the official filed return or professional tax advice.
      </p>
    </div>
  `;
}

function renderDeductionRow(label, amount) {
  if (!amount || amount === 0) return '';
  return `<tr><td>${label}</td><td class="amount">${formatCurrency(amount)}</td></tr>`;
}

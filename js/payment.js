// Handles Razorpay payment flow and watermark unlock status.
// Replace WORKER_URL with your deployed Cloudflare Worker URL.
// Replace RAZORPAY_KEY_ID with your Razorpay key id (test or live).

const WORKER_URL = 'https://itr-payment-verify.violetpinnacle.workers.dev';
const PAYMENT_AMOUNT_RUPEES = 49; // change this to whatever you want to charge

function isPaid() {
  return sessionStorage.getItem('itr1_paid') === 'true';
}

function markPaid() {
  sessionStorage.setItem('itr1_paid', 'true');
}

async function startPayment(onSuccessCallback) {
  try {
    const orderRes = await fetch(WORKER_URL + '/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: PAYMENT_AMOUNT_RUPEES })
    });
    const orderData = await orderRes.json();

    if (!orderRes.ok || !orderData.order) {
      alert('Could not start payment. Please try again.');
      console.error(orderData);
      return;
    }

    const options = {
      key: orderData.key_id,
      amount: orderData.order.amount,
      currency: orderData.order.currency,
      name: 'Violet Pinnacle',
      description: 'ITR Computation Sheet - Remove Watermark',
      order_id: orderData.order.id,
      handler: async function (response) {
        const verifyRes = await fetch(WORKER_URL + '/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          })
        });
        const verifyData = await verifyRes.json();

        if (verifyData.verified) {
          markPaid();
          if (onSuccessCallback) onSuccessCallback();
        } else {
          alert('Payment verification failed. Please contact support if amount was deducted.');
        }
      },
      theme: { color: '#5a1e78' }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  } catch (err) {
    console.error(err);
    alert('Something went wrong starting the payment.');
  }
}

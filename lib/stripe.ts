import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  appInfo: {
    name: 'Finance SaaS Webapp',
  },
});

export const getStripeJs = async () => {
  if (typeof window === 'undefined') {
    return null;
  }

  // Загрузка Stripe.js в браузере
  const { loadStripe } = await import('@stripe/stripe-js');
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
}; 
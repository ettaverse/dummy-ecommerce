import { test, expect } from '@playwright/test';

const validShipping = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@example.com',
  address: '123 Main St',
  city: 'Testville',
  state: 'CA',
  zipCode: '90210',
};

const validPayment = {
  nameOnCard: 'Jane Doe',
  cardNumber: '4242424242424242',
  expiryDate: '12/34',
  cvv: '123',
};

test.describe('Dummy Ecommerce App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('product-count')).toBeVisible();
  });

  test('Product Listing supports search, category filter, empty state, and sort', async ({ page }) => {
    await page.getByTestId('search-input').fill('Headphones');
    await expect(page.getByTestId('product-count')).toHaveText('1 product found');
    await expect(page.getByTestId('product-card-prod-001')).toBeVisible();

    await page.getByTestId('search-input').fill('');
    await page.getByTestId('category-filter').selectOption('electronics');
    await expect(page.getByTestId('product-count')).toHaveText('4 products found');
    await expect(page.locator('[data-testid="product-card-prod-005"]')).toHaveCount(0);

    await page.getByTestId('search-input').fill('NoSuchProduct');
    await expect(page.getByTestId('product-count')).toHaveText('0 products found');
    await expect(page.getByTestId('no-products')).toBeVisible();

    await page.getByTestId('search-input').fill('');
    await page.getByTestId('category-filter').selectOption('electronics');
    await page.getByTestId('sort-select').selectOption('price_asc');

    const electronicsCards = page.locator('[data-testid^="product-card-prod-"]');
    await expect(electronicsCards).toHaveCount(4);
    const electronicsNames = await electronicsCards.allTextContents();
    expect(electronicsNames[0]).toContain('USB-C Hub');
    expect(electronicsNames[1]).toContain('Bluetooth Speaker');
    expect(electronicsNames[2]).toContain('Wireless Headphones');
    expect(electronicsNames[3]).toContain('Mechanical Keyboard');
  });

  test('Product Detail page shows product data and out-of-stock state', async ({ page }) => {
    await page.getByTestId('product-card-prod-001').click();
    await expect(page.getByTestId('product-name')).toHaveText('Wireless Headphones');
    await expect(page.getByTestId('product-price')).toHaveText('$79.99');
    await expect(page.getByTestId('product-category')).toHaveText('electronics');
    await expect(page.getByTestId('add-to-cart-button')).toBeEnabled();

    await page.goto('/products/prod-008');
    await expect(page.getByTestId('product-name')).toHaveText('Wool Beanie');
    await expect(page.getByTestId('add-to-cart-button')).toBeDisabled();
  });

  test('Cart operations update badge, quantity, total and empty state', async ({ page }) => {
    await page.goto('/products/prod-001');
    await page.getByTestId('add-to-cart-button').click();
    await expect(page.getByTestId('cart-count')).toHaveText('1');

    await page.getByTestId('cart-link').click();
    await expect(page).toHaveURL(/\/cart$/);

    await expect(page.getByTestId('cart-item-prod-001')).toBeVisible();
    await expect(page.getByTestId('cart-item-quantity-prod-001')).toHaveText('1');
    await expect(page.getByTestId('cart-total')).toHaveText('$79.99');

    await page.getByTestId('quantity-increase-prod-001').click();
    await expect(page.getByTestId('cart-item-quantity-prod-001')).toHaveText('2');
    await expect(page.getByTestId('cart-total')).toHaveText('$159.98');

    await page.getByTestId('quantity-decrease-prod-001').click();
    await expect(page.getByTestId('cart-item-quantity-prod-001')).toHaveText('1');
    await expect(page.getByTestId('cart-total')).toHaveText('$79.99');

    await page.getByTestId('remove-item-prod-001').click();
    await expect(page.locator('[data-testid="cart-item-prod-001"]')).toHaveCount(0);
    await expect(page.getByTestId('empty-cart-message')).toBeVisible();
  });

  test('Checkout form validation shows inline error messages', async ({ page }) => {
    await page.goto('/products/prod-001');
    await page.getByTestId('add-to-cart-button').click();
    await page.goto('/checkout');

    await page.getByTestId('submit-order-button').click();
    await expect(page.getByTestId('field-error-shipping-first-name')).toHaveText('First name is required');
    await expect(page.getByTestId('field-error-shipping-email')).toHaveText('Email is required');
    await expect(page.getByTestId('field-error-shipping-zip')).toHaveText('Zip code is required');
    await expect(page.getByTestId('field-error-payment-card-number')).toHaveText('Card number is required');

    await page.getByTestId('shipping-first-name').fill(validShipping.firstName);
    await page.getByTestId('shipping-last-name').fill(validShipping.lastName);
    await page.getByTestId('shipping-email').fill('invalid-email');
    await page.getByTestId('shipping-address').fill(validShipping.address);
    await page.getByTestId('shipping-city').fill(validShipping.city);
    await page.getByTestId('shipping-state').fill(validShipping.state);
    await page.getByTestId('shipping-zip').fill(validShipping.zipCode);
    await page.getByTestId('payment-name').fill(validPayment.nameOnCard);
    await page.getByTestId('payment-card-number').fill(validPayment.cardNumber);
    await page.getByTestId('payment-expiry').fill(validPayment.expiryDate);
    await page.getByTestId('payment-cvv').fill(validPayment.cvv);
    await page.getByTestId('submit-order-button').click();
    await expect(page.getByTestId('field-error-shipping-email')).toHaveText('Invalid email format');

    await page.getByTestId('shipping-email').fill(validShipping.email);
    await page.getByTestId('shipping-zip').fill('123');
    await page.getByTestId('submit-order-button').click();
    await expect(page.getByTestId('field-error-shipping-zip')).toHaveText('Zip code must be 5 digits');
  });

  test('End-to-end happy path places an order and shows order confirmation', async ({ page }) => {
    await page.getByTestId('product-card-prod-002').click();
    await page.getByTestId('add-to-cart-button').click();

    await page.getByTestId('cart-link').click();
    await expect(page).toHaveURL(/\/cart$/);
    await page.getByTestId('checkout-button').click();
    await expect(page).toHaveURL(/\/checkout$/);

    await page.getByTestId('shipping-first-name').fill(validShipping.firstName);
    await page.getByTestId('shipping-last-name').fill(validShipping.lastName);
    await page.getByTestId('shipping-email').fill(validShipping.email);
    await page.getByTestId('shipping-address').fill(validShipping.address);
    await page.getByTestId('shipping-city').fill(validShipping.city);
    await page.getByTestId('shipping-state').fill(validShipping.state);
    await page.getByTestId('shipping-zip').fill(validShipping.zipCode);
    await page.getByTestId('payment-name').fill(validPayment.nameOnCard);
    await page.getByTestId('payment-card-number').fill(validPayment.cardNumber);
    await page.getByTestId('payment-expiry').fill(validPayment.expiryDate);
    await page.getByTestId('payment-cvv').fill(validPayment.cvv);

    await page.getByTestId('submit-order-button').click();
    await page.waitForURL(/\/order-confirmation\?orderId=.*/);
    await expect(page.getByTestId('order-confirmation')).toBeVisible();
    await expect(page.getByTestId('order-id')).not.toBeEmpty();
  });
});

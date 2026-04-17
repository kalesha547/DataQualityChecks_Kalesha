import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'pdfs');

function createPDF(filename, buildFn) {
  return new Promise((resolve, reject) => {
    const doc  = new PDFDocument({ margin: 50 });
    const out  = fs.createWriteStream(path.join(OUT, filename));
    doc.pipe(out);
    buildFn(doc);
    doc.end();
    out.on('finish', () => { console.log(`  ✅  ${filename}`); resolve(); });
    out.on('error', reject);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const h1  = (doc, t) => doc.fontSize(20).font('Helvetica-Bold').text(t).moveDown(0.5);
const h2  = (doc, t) => doc.fontSize(14).font('Helvetica-Bold').text(t).moveDown(0.3);
const p   = (doc, t) => doc.fontSize(11).font('Helvetica').text(t, { align: 'justify' }).moveDown(0.5);
const hr  = (doc)    => doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(0.5);
const kv  = (doc, k, v) => doc.fontSize(11).font('Helvetica-Bold').text(`${k}: `, { continued: true })
                               .font('Helvetica').text(v).moveDown(0.2);

// ─────────────────────────────────────────────────────────────────────────────
// 1. ecommerce-policy.pdf
// ─────────────────────────────────────────────────────────────────────────────
async function makePolicyPDF() {
  await createPDF('ecommerce-policy.pdf', doc => {
    h1(doc, 'eCommerce Store — Policy Document');
    doc.fontSize(10).font('Helvetica').text('Effective Date: January 1, 2025').moveDown(1);

    h2(doc, '1. Return & Refund Policy');
    p(doc, 'Customers may return any grocery item within 7 days of purchase if the product is unused, unopened, and in its original packaging. Perishable items such as dairy, meat, and fresh produce are non-returnable once delivered.');
    p(doc, 'Refunds are processed within 5–7 business days to the original payment method. For damaged or defective products, a full refund or replacement will be issued within 24 hours of reporting the issue.');

    h2(doc, '2. Delivery Policy');
    p(doc, 'Standard delivery is available Monday to Saturday, 9 AM – 8 PM. Express delivery (within 2 hours) is available in select areas for an additional charge of ₹49. Free delivery is offered on orders above ₹999.');
    p(doc, 'Orders placed before 12 PM are eligible for same-day delivery. Delivery slots must be selected at checkout and cannot be changed after order confirmation.');

    h2(doc, '3. Reward Points Policy');
    p(doc, 'Customers earn 1 reward point for every ₹10 spent. Reward points can be redeemed at a rate of 100 points = ₹10 discount on future orders. Points expire 12 months from the date of earning.');
    p(doc, 'Bonus reward points (3x) are awarded during festive sales and special promotions. Points cannot be transferred between accounts or redeemed for cash.');

    hr(doc);
    h2(doc, '4. Payment Policy');
    p(doc, 'We accept UPI, credit/debit cards, net banking, and cash on delivery. EMI options are available on orders above ₹2,000 for select bank cards. All online transactions are secured with 256-bit SSL encryption.');
    p(doc, 'Cash on delivery is available for orders below ₹5,000. A convenience fee of ₹25 applies to COD orders. Payment must be made in full at the time of delivery.');

    h2(doc, '5. Privacy Policy');
    p(doc, 'We collect customer mobile numbers, purchase history, and delivery addresses solely for processing orders and personalising the shopping experience. Customer data is never sold to third parties.');
    p(doc, 'Customers may request deletion of their account and associated data by contacting support@paaf.store. Data deletion requests are processed within 30 days.');

    h2(doc, '6. Cancellation Policy');
    p(doc, 'Orders can be cancelled within 30 minutes of placement at no charge. After 30 minutes, cancellation may not be possible if the order has been dispatched. For prepaid orders, refunds for cancellations are processed within 3–5 business days.');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. product-catalog.pdf
// ─────────────────────────────────────────────────────────────────────────────
async function makeCatalogPDF() {
  await createPDF('product-catalog.pdf', doc => {
    h1(doc, 'PAAF Grocery — Product Catalog 2025');
    p(doc, 'This catalog lists all available grocery products with their current pricing, category, and reward points per unit.');
    hr(doc);

    const categories = [
      {
        name: 'Dairy & Eggs',
        items: [
          { name: 'Full Cream Milk (1L)',        price: '₹68',  points: 7,  stock: 'In Stock' },
          { name: 'Curd / Yogurt (500g)',         price: '₹45',  points: 5,  stock: 'In Stock' },
          { name: 'Paneer (200g)',                price: '₹89',  points: 9,  stock: 'In Stock' },
          { name: 'Butter Salted (100g)',         price: '₹55',  points: 6,  stock: 'In Stock' },
          { name: 'Eggs (12 pack)',               price: '₹78',  points: 8,  stock: 'In Stock' },
        ],
      },
      {
        name: 'Staples & Grains',
        items: [
          { name: 'Basmati Rice (5kg)',           price: '₹420', points: 42, stock: 'In Stock' },
          { name: 'Atta Wheat Flour (10kg)',      price: '₹380', points: 38, stock: 'In Stock' },
          { name: 'Toor Dal (1kg)',               price: '₹145', points: 15, stock: 'In Stock' },
          { name: 'Moong Dal (1kg)',              price: '₹135', points: 14, stock: 'In Stock' },
          { name: 'Poha (500g)',                  price: '₹42',  points: 4,  stock: 'Limited' },
        ],
      },
      {
        name: 'Fruits & Vegetables',
        items: [
          { name: 'Tomatoes (1kg)',               price: '₹35',  points: 4,  stock: 'In Stock' },
          { name: 'Onions (1kg)',                 price: '₹28',  points: 3,  stock: 'In Stock' },
          { name: 'Potatoes (1kg)',               price: '₹25',  points: 3,  stock: 'In Stock' },
          { name: 'Bananas (dozen)',              price: '₹48',  points: 5,  stock: 'In Stock' },
          { name: 'Apples (1kg)',                 price: '₹180', points: 18, stock: 'In Stock' },
        ],
      },
      {
        name: 'Oils & Condiments',
        items: [
          { name: 'Sunflower Oil (1L)',           price: '₹165', points: 17, stock: 'In Stock' },
          { name: 'Mustard Oil (1L)',             price: '₹175', points: 18, stock: 'In Stock' },
          { name: 'Tomato Ketchup (500g)',        price: '₹95',  points: 10, stock: 'In Stock' },
          { name: 'Salt (1kg)',                   price: '₹22',  points: 2,  stock: 'In Stock' },
          { name: 'Sugar (1kg)',                  price: '₹48',  points: 5,  stock: 'In Stock' },
        ],
      },
      {
        name: 'Snacks & Beverages',
        items: [
          { name: 'Biscuits Assorted (400g)',     price: '₹85',  points: 9,  stock: 'In Stock' },
          { name: 'Chips (150g)',                 price: '₹30',  points: 3,  stock: 'In Stock' },
          { name: 'Green Tea (25 bags)',          price: '₹120', points: 12, stock: 'In Stock' },
          { name: 'Coffee Instant (100g)',        price: '₹210', points: 21, stock: 'Limited' },
          { name: 'Fruit Juice (1L)',             price: '₹99',  points: 10, stock: 'In Stock' },
        ],
      },
    ];

    for (const cat of categories) {
      h2(doc, cat.name);
      for (const item of cat.items) {
        doc.fontSize(10).font('Helvetica')
          .text(`• ${item.name}`, { continued: true })
          .font('Helvetica-Bold')
          .text(`   ${item.price}`, { continued: true })
          .font('Helvetica')
          .text(`   | ${item.points} pts | ${item.stock}`);
      }
      doc.moveDown(0.5);
    }

    hr(doc);
    p(doc, 'Prices are inclusive of all taxes. Reward points are credited within 24 hours of delivery confirmation. Seasonal items may vary. For bulk orders above 50 units, contact sales@paaf.store for special pricing.');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. customer-rewards-guide.pdf
// ─────────────────────────────────────────────────────────────────────────────
async function makeRewardsPDF() {
  await createPDF('customer-rewards-guide.pdf', doc => {
    h1(doc, 'Customer Rewards Programme — Complete Guide');
    p(doc, 'Welcome to the PAAF Grocery Rewards Programme. This guide explains how to earn, redeem, and maximise your reward points on every purchase.');
    hr(doc);

    h2(doc, 'How to Earn Points');
    p(doc, 'You earn reward points automatically on every completed transaction. The standard earning rate is 1 point per ₹10 spent. Points are calculated on the pre-discount order total and credited to your account within 24 hours of delivery confirmation.');
    doc.fontSize(11).font('Helvetica')
      .text('  • Standard purchases     : 1 point per ₹10').moveDown(0.2)
      .text('  • Weekend bonus          : 2 points per ₹10 (Sat & Sun)').moveDown(0.2)
      .text('  • Festive sale           : 3 points per ₹10').moveDown(0.2)
      .text('  • First order bonus      : 200 extra points').moveDown(0.2)
      .text('  • Referral bonus         : 150 points per successful referral').moveDown(0.8);

    h2(doc, 'Reward Tiers');
    p(doc, 'Customers are automatically upgraded to higher tiers based on their cumulative annual spend. Higher tiers unlock better rewards and exclusive offers.');
    const tiers = [
      ['Silver', '₹0 – ₹4,999/year',    '1x points,  standard delivery'],
      ['Gold',   '₹5,000 – ₹14,999/year', '1.5x points, priority delivery'],
      ['Platinum','₹15,000+/year',        '2x points,  free express delivery'],
    ];
    for (const [tier, spend, benefit] of tiers) {
      doc.fontSize(11).font('Helvetica-Bold').text(`  ${tier}`, { continued: true })
        .font('Helvetica').text(`  ${spend}  —  ${benefit}`).moveDown(0.3);
    }
    doc.moveDown(0.3);

    h2(doc, 'How to Redeem Points');
    p(doc, 'Points can be redeemed at checkout. The minimum redemption is 100 points (₹10 value). You can redeem a maximum of 500 points (₹50) per order. Redemption is available only on orders above ₹199.');
    kv(doc, 'Conversion rate', '100 points = ₹10 discount');
    kv(doc, 'Minimum redemption', '100 points');
    kv(doc, 'Maximum per order', '500 points (₹50)');
    kv(doc, 'Minimum order value', '₹199');
    doc.moveDown(0.5);

    h2(doc, 'Points Expiry');
    p(doc, 'Earned points are valid for 12 months from the date of credit. Points are consumed on a first-earned, first-used basis. You will receive an email notification 30 days before any points are set to expire.');

    hr(doc);
    h2(doc, 'Frequently Asked Questions');
    const faqs = [
      ['Can I transfer points to another account?', 'No. Points are non-transferable and linked to your mobile number.'],
      ['What happens to points if I return an item?', 'Points earned on returned items are reversed from your balance.'],
      ['Do points apply on discounted items?', 'Yes, points are earned on the final amount paid after all discounts.'],
      ['Can I use points with a coupon code?', 'Yes, points and coupons can be combined in a single order.'],
      ['How do I check my points balance?', 'Log in to the app or website and go to My Account > Rewards.'],
    ];
    for (const [q, a] of faqs) {
      doc.fontSize(11).font('Helvetica-Bold').text(`Q: ${q}`).moveDown(0.1);
      doc.font('Helvetica').text(`A: ${a}`).moveDown(0.5);
    }

    hr(doc);
    p(doc, 'For assistance with your rewards account, contact support@paaf.store or call 1800-123-4567 (Mon–Sat, 9 AM – 6 PM).');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nGenerating sample PDFs...\n');
await makePolicyPDF();
await makeCatalogPDF();
await makeRewardsPDF();
console.log('\nAll PDFs created in: pdfs/\n');

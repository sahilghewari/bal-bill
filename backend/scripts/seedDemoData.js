const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../middleware/logger');

const seedDemoData = async () => {
  try {
    console.log('🌱 Seeding demo data...\n');

    console.log('📦 Creating customers...');
    const customerIds = [];
    const customers = [
      {
        name: 'TechCorp India',
        email: 'billing@techcorp.in',
        phone: '+91-9876543210',
        country: 'India',
        currency: 'USD',
        billing_day: 1,
      },
      {
        name: 'Global Telecom Canada',
        email: 'finance@globaltelecom.ca',
        phone: '+1-416-555-1234',
        country: 'Canada',
        currency: 'CAD',
        billing_day: 15,
      },
      {
        name: 'Manila Communications',
        email: 'accounts@manila-comm.ph',
        phone: '+63-2-8888-0000',
        country: 'Philippines',
        currency: 'PHP',
        billing_day: 10,
      },
    ];

    for (const customer of customers) {
      const customerId = uuidv4();
      const query = `
        INSERT INTO customers
        (id, name, email, phone, country, currency, billing_day, current_balance, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
      `;
      await pool.query(query, [
        customerId,
        customer.name,
        customer.email,
        customer.phone,
        customer.country,
        customer.currency,
        customer.billing_day,
        1000.0,
        'active',
      ]);
      customerIds.push(customerId);
      console.log(`  ✅ ${customer.name} (ID: ${customerId})`);
    }

    console.log('\n📋 Creating rate cards...');
    const rateCards = [
      {
        customerId: customerIds[0],
        service_type: 'DID',
        initial_block_seconds: 60,
        next_block_seconds: 60,
        price_per_minute: 0.004,
        connection_fee_flat: 0,
        effective_date: '2025-12-01',
      },
      {
        customerId: customerIds[0],
        service_type: 'VIRTUAL_NUMBER',
        initial_block_seconds: 30,
        next_block_seconds: 30,
        price_per_minute: 0.005,
        connection_fee_flat: 0.01,
        effective_date: '2025-12-01',
      },
      {
        customerId: customerIds[1],
        service_type: 'DID',
        initial_block_seconds: 6,
        next_block_seconds: 6,
        price_per_minute: 0.0045,
        connection_fee_flat: 0.05,
        effective_date: '2025-12-01',
      },
      {
        customerId: customerIds[1],
        service_type: 'VIRTUAL_NUMBER',
        initial_block_seconds: 15,
        next_block_seconds: 15,
        price_per_minute: 0.006,
        connection_fee_flat: 0.02,
        effective_date: '2025-12-01',
      },
      {
        customerId: customerIds[2],
        service_type: 'DID',
        initial_block_seconds: 60,
        next_block_seconds: 60,
        price_per_minute: 0.0035,
        connection_fee_flat: 0,
        effective_date: '2025-12-01',
      },
    ];

    for (const rateCard of rateCards) {
      const rateCardId = uuidv4();
      const query = `
        INSERT INTO rate_cards
        (id, customer_id, service_type, initial_block_seconds, next_block_seconds,
         price_per_minute, connection_fee_flat, effective_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
      `;
      await pool.query(query, [
        rateCardId,
        rateCard.customerId,
        rateCard.service_type,
        rateCard.initial_block_seconds,
        rateCard.next_block_seconds,
        rateCard.price_per_minute,
        rateCard.connection_fee_flat,
        rateCard.effective_date,
        'active',
      ]);
      const customerIndex = customerIds.indexOf(rateCard.customerId);
      console.log(`  ✅ ${rateCard.service_type} for ${customers[customerIndex].name}`);
    }

    console.log('\n📞 Creating demo CDRs...');
    const cdrData = [
      {
        customerId: customerIds[0],
        caller_id: '+1-555-0001',
        callee_id: '+91-9876543210',
        destination: 'Mumbai',
        duration_seconds: 65,
        service_type: 'DID',
      },
      {
        customerId: customerIds[0],
        caller_id: '+1-555-0002',
        callee_id: '+91-9876543210',
        destination: 'Delhi',
        duration_seconds: 180,
        service_type: 'DID',
      },
      {
        customerId: customerIds[0],
        caller_id: '+1-555-0003',
        callee_id: '+91-9876543210',
        destination: 'Bangalore',
        duration_seconds: 45,
        service_type: 'DID',
      },
      {
        customerId: customerIds[0],
        caller_id: '+91-9876543210',
        callee_id: '+1-555-0004',
        destination: 'Toronto',
        duration_seconds: 300,
        service_type: 'VIRTUAL_NUMBER',
      },
      {
        customerId: customerIds[1],
        caller_id: '+1-416-0001',
        callee_id: '+1-416-555-1234',
        destination: 'Vancouver',
        duration_seconds: 65,
        service_type: 'DID',
      },
      {
        customerId: customerIds[1],
        caller_id: '+1-416-0002',
        callee_id: '+1-416-555-1234',
        destination: 'Toronto',
        duration_seconds: 120,
        service_type: 'DID',
      },
      {
        customerId: customerIds[2],
        caller_id: '+63-2-0001',
        callee_id: '+63-2-8888-0000',
        destination: 'Makati',
        duration_seconds: 85,
        service_type: 'DID',
      },
      {
        customerId: customerIds[2],
        caller_id: '+63-2-0002',
        callee_id: '+63-2-8888-0000',
        destination: 'Cebu',
        duration_seconds: 95,
        service_type: 'DID',
      },
    ];

    for (const cdr of cdrData) {
      const cdrId = uuidv4();
      const startTime = new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + cdr.duration_seconds * 1000);

      const query = `
        INSERT INTO cdrs
        (id, customer_id, caller_id, callee_id, destination, start_time, end_time,
         duration_seconds, service_type, billing_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id;
      `;
      await pool.query(query, [
        cdrId,
        cdr.customerId,
        cdr.caller_id,
        cdr.callee_id,
        cdr.destination,
        startTime,
        endTime,
        cdr.duration_seconds,
        cdr.service_type,
        'pending',
      ]);
    }
    console.log(`  ✅ Created ${cdrData.length} demo CDRs`);

    console.log('\n✅ Demo data seeding complete!\n');
    console.log('📊 Summary:');
    console.log(`  - Customers: ${customerIds.length}`);
    console.log(`  - Rate Cards: ${rateCards.length}`);
    console.log(`  - CDRs (pending): ${cdrData.length}`);
    console.log('\nCustomer IDs for testing:');
    customerIds.forEach((id, index) => {
      console.log(`  Customer ${index + 1}: ${id}`);
    });

    process.exit(0);
  } catch (error) {
    logger.error('Demo data seeding failed', { error: error.message });
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedDemoData();

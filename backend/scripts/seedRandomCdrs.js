const { pool } = require('../config/database')
const { v4: uuidv4 } = require('uuid')
const logger = require('../middleware/logger')

const SERVICE_TYPES = ['DID', 'VIRTUAL_NUMBER']
const DESTINATIONS = ['New York', 'London', 'Mumbai', 'Toronto', 'Sydney', 'Dubai', 'Singapore', 'São Paulo']

const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)]

const randomPhone = () => {
  const countryCodes = ['+1', '+44', '+91', '+61', '+971', '+65', '+55']
  const code = randomChoice(countryCodes)
  const number = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('')
  return `${code}-${number}`
}

const randomDuration = () => Math.floor(Math.random() * 570) + 30 // 30s - 10min

const randomStartTime = () => {
  const now = Date.now()
  const pastWindow = 30 * 24 * 60 * 60 * 1000
  const timestamp = now - Math.floor(Math.random() * pastWindow)
  return new Date(timestamp)
}

const getRateCardId = async (customerId, serviceType) => {
  const result = await pool.query(
    'SELECT id FROM rate_cards WHERE customer_id = $1 AND service_type = $2 ORDER BY effective_date DESC LIMIT 1',
    [customerId, serviceType]
  )
  return result.rows[0]?.id || null
}

const seedRandomCdrs = async () => {
  const client = await pool.connect()
  try {
    console.log('📞 Generating 100 random CDRs...')
    const { rows: customers } = await client.query('SELECT id, name FROM customers')

    if (!customers.length) {
      console.error('❌ No customers found. Seed customers first.')
      process.exit(1)
    }

    let inserted = 0

    for (let i = 0; i < 100; i += 1) {
      const customer = randomChoice(customers)
      const serviceType = randomChoice(SERVICE_TYPES)
      const startTime = randomStartTime()
      const duration = randomDuration()
      const endTime = new Date(startTime.getTime() + duration * 1000)
      const rateCardId = await getRateCardId(customer.id, serviceType)

      const query = `
        INSERT INTO cdrs
        (id, customer_id, caller_id, callee_id, destination, start_time, end_time,
         duration_seconds, service_type, rate_card_id, billing_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
      `

      await client.query(query, [
        uuidv4(),
        customer.id,
        randomPhone(),
        randomPhone(),
        randomChoice(DESTINATIONS),
        startTime,
        endTime,
        duration,
        serviceType,
        rateCardId,
        'pending',
      ])

      inserted += 1
    }

    console.log(`✅ Inserted ${inserted} random CDRs across ${customers.length} customers.`)
  } catch (error) {
    logger.error('Failed to seed random CDRs', { error: error.message })
    console.error('❌ Error inserting CDRs:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seedRandomCdrs()

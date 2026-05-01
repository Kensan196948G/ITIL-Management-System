import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

setup('authenticate', async ({ request }) => {
  const res = await request.post('http://localhost:8000/api/v1/auth/login', {
    data: {
      username: 'admin@itil.local',
      password: 'Admin123!',
    },
  })

  if (res.status() === 401) {
    await request.post('http://localhost:8000/api/v1/auth/register', {
      data: {
        email: 'admin@itil.local',
        password: 'Admin123!',
        full_name: 'Admin User',
      },
    })
    const loginRes = await request.post('http://localhost:8000/api/v1/auth/login', {
      data: {
        username: 'admin@itil.local',
        password: 'Admin123!',
      },
    })
    expect(loginRes.status()).toBe(200)
    const loginData = await loginRes.json()
    process.env.STORED_ACCESS_TOKEN = loginData.access_token
  } else {
    expect(res.status()).toBe(200)
    const data = await res.json()
    process.env.STORED_ACCESS_TOKEN = data.access_token
  }

  await request.storageState({ path: authFile })
})

const fetch = require('node-fetch')
const fs = require('fs')
;(async () => {
    // find frontend base URL
    const candidates = ['http://localhost:3001', 'http://localhost:3000']
    let base = null
    for (const c of candidates) {
        try {
            const res = await fetch(c)
            if (res.ok || res.status === 200) {
                base = c
                break
            }
        } catch (e) {}
    }
    if (!base) {
        console.error('Frontend dev server not reachable at 3001 or 3000')
        process.exit(1)
    }

    const apiBase = process.env.VITE_API_URL || 'http://localhost:8080'

    // register a new bolsista user
    const timestamp = Date.now()
    const login = `auto${timestamp}`
    const email = `${login}@example.com`
    const senha = 'P4ssword!'
    const nome = `Auto User ${timestamp}`

    const registerRes = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, login, email, senha, perfil: 'bolsista' }),
    })
    if (!registerRes.ok) {
        console.error('Register failed', await registerRes.text())
        process.exit(1)
    }
    const j = await registerRes.json()
    const token = j.token
    console.log('Registered user', login)

    // install playwright if not installed
    try {
        require('playwright')
    } catch (e) {
        console.log('Playwright not installed, please install with: npm i -D playwright')
        process.exit(1)
    }

    const { chromium } = require('playwright')
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()

    // set auth token in localStorage
    await page.goto(base)
    await page.evaluate((t) => localStorage.setItem('auth_token', t), token)

    // open editor new article
    await page.goto(`${base}/dashboard/artigos/novo`)
    await page.waitForSelector('#titulo')

    // fill title and slug
    await page.fill('#titulo', 'Teste Automático de Pré-visualização')
    // ensure at least one section
    // add paragraph
    await page.click('button:has-text("Parágrafo")')
    // fill first textarea
    await page.fill(
        'textarea[placeholder="Digite o parágrafo..."]',
        'Conteúdo de rascunho para pré-visualização',
    )
    // set slug
    await page.fill('#slug', `auto-slug-${timestamp}`)

    // click verificar
    const verificarBtn = await page.locator('button:has-text("Verificar")')
    await verificarBtn.click()
    // wait for availability message
    await page.waitForSelector('text=/disponível|indisponível/i', { timeout: 5000 })

    // capture screenshot of slug area and messages
    const slugEl = await page.locator('#slug')
    await slugEl.screenshot({ path: 'preview-slug.png' })
    console.log('Saved screenshot: preview-slug.png')

    // click preview which should save draft and open preview in new page
    const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        page.click('button:has-text("Pré-visualizar")'),
    ])
    await newPage.waitForLoadState('networkidle')
    await newPage.screenshot({ path: 'preview-page.png', fullPage: true })
    console.log('Saved screenshot: preview-page.png')

    await browser.close()
})()

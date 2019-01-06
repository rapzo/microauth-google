const test = require('ava')
const listen = require('test-listen')
const micro = require('micro')
const got = require('got')
const microAuthGoogle = require('.')
const nock = require('nock')

const {send} = micro

const PROFILE_URL = 'https://www.googleapis.com/plus/v1/people/me'

const config = {
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  callbackUrl: 'CALLBACK_URL',
  path: '/auth/google',
  scope: 'https://www.googleapis.com/auth/plus.me'
}

const microAuth = microAuthGoogle(config)
test('dryrun', async (t) => {
  const service = micro(microAuth(async (req, res, auth) => ''))
  const url = await listen(service)
  const res = await got(`${url}/auth/google`, {followRedirect: false})
  
  t.is(res.statusCode, 302)
})

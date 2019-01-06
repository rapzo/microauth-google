'use strict'

const querystring = require('querystring')
const url = require('url')
const {OAuth2Client} = require('google-auth-library');
const uuid = require('uuid')
const redirect = require('micro-redirect')
const assert = require('assert')

const provider = 'google';
const DEFAULT_SCOPE = [
  'https://www.googleapis.com/auth/plus.me'
]
const PROFILE_URL = 'https://www.googleapis.com/plus/v1/people/me'

const microAuthGoogle = ({
  clientId,
  clientSecret,
  callbackUrl,
  path,
  scopes = DEFAULT_SCOPE,
  accessType = 'offline'
}) => {
  const states = [];
  const oAuth2Client = new OAuth2Client(clientId, clientSecret, callbackUrl)
  const scope = [].concat(scopes)

  assert(
    Array.isArray(scope) && scope.length > 0,
    'Invalid scopes'
  )

  return fn => async (req, res, ...args) => {
    const {pathname, query} = url.parse(req.url)
    if (pathname === path) {
      try {
        const state = uuid.v4()
        states.push(state)

        const redirectUrl = oAuth2Client.generateAuthUrl({
          // eslint-disable-next-line camelcase
          access_type: accessType,
          scope,
          state
        })

        return redirect(res, 302, redirectUrl)
      } catch (error) {
        console.log(...args.concat({error, provider}))
        return fn(req, res, ...args.concat({error, provider}))
      }
    }

    const callbackPath = url.parse(callbackUrl).pathname
    if (pathname === callbackPath) {
      try {
        const {state, code} = querystring.parse(query)
        if (!states.includes(state)) {
          return fn(req, res, ...args.concat({
            provider,
            error: new Error('Invalid state')
          }))
        }

        states.splice(states.indexOf(state), 1)

        const {tokens, error} = await oAuth2Client.getToken(code)
        if (error) {
          return fn(req, res, ...args.concat({error, provider}))
        }

        oAuth2Client.setCredentials(tokens);

        const {data} = await oAuth2Client.request({url: PROFILE_URL})
        const result = {
          provider,
          accessToken: tokens.access_token,
          info: data,
          client: oAuth2Client
        }

        return fn(req, res, ...args.concat({result}))
      } catch (error) {
        console.log(...args.concat({error, provider}))
        return fn(req, res, ...args.concat({error, provider}))
      }
    }

    return fn(req, res, ...args)
  }
}

module.exports = microAuthGoogle

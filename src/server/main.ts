import * as dotenv from 'dotenv'
import Application from '@server/application'
import setupExpress from '@server/config/express'
import Config from '@server/config/config'

dotenv.config()

new Application(
  new Config(),
  setupExpress(),
).listen()

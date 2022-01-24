'use strict'

module.exports = async (event, context) => {
  const result = {
    'body': JSON.stringify(event.body),
    'content-type': event.headers["content-type"],
    'pokus': 'faas-node16'
  }

  return context
    .status(200)
    .succeed(result)
}

// https://docs.openfaas.com/tutorials/cli-with-node/

'use strict'

module.exports = async (event, context) => {
  const pokusmsg = `le lien [${event.body.name}] a pour valeur [${event.body.url}]`
  const result = {
    'body': JSON.stringify(event.body),
    'content-type': event.headers["content-type"],
    'pokus': 'faas-node16',
    'pokusmsg': `${pokusmsg}`
    /* 'event': event */
  }

  return context
    .status(200)
    .succeed(result)
}

// https://docs.openfaas.com/tutorials/cli-with-node/

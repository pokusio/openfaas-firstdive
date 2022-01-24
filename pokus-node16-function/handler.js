'use strict'


/***********************************************************************************************************************
 * curl -X GET http://127.0.0.1:8080/function/pokus-node16-function   -H "Content-Type: application/json"
 *
 */
/***********************************************************************************************************************
 *
 * curl -X POST http://127.0.0.1:8080/function/pokus-node16-function \
 *  -H "Content-Type: application/json" \
 *   -d '{ "url": "https://randomuser.me/api/", "name": "pokustest"}'
 */
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

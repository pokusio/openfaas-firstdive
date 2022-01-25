'use strict'

/*
import * as shelljs from 'shelljs';
import * as fs from 'fs';
import * as arrayUtils from 'util';
*/
const fs = require('fs')
const shelljs = require('shelljs') // npm i -s shelljs@0.8.5

/***********************************************************************************************************************
 *    This function will create github repository:
 *      > into the specified github org,
 *      > with the specified github repo name
 *
 *    The secret named 'pokusbot-gh-token' will e stored on disk at:
 *    /var/openfaas/secrets/pokusbot-gh-token
 *
 *   https://github.com/cli/cli
 */

/***********************************************************************************************************************
 *    EXAMPLE USAGE:
 */
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
module.exports = async (event, context) => { // context will be useful

  const ghPTokenSecretName = `pokusbot-gh-token`
  const ghPTokenSecretFilePath = `/var/openfaas/secrets/${ghPTokenSecretName}`

  // --- + --- + --- + --- + --- + --- + --- + --- + --- + --- + --- + --- + --- + --- //
  // loadReleaseManifest()  : void {
  if (!fs.existsSync(ghPTokenSecretFilePath)) {
    throw new Error("{[PokusFaasNode16]} - [" + `${ghPTokenSecretFilePath}` + "] does not exists, stopping release process");
  } else {
    console.log("{[PokusFaasNode16]} - found [ghPTokenSecretFilePath] secret file located at [" + ghPTokenSecretFilePath + "]");
  }
  console.info("{[PokusFaasNode16]} - Parsing [ghPTokenSecretFilePath] secret file file located at [" + ghPTokenSecretFilePath + "]");
  let ghPTokenSecret = fs.readFileSync(`${ghPTokenSecretFilePath}`,'utf8');
  console.info("{[PokusFaasNode16]} - Parsed Github Personal Access Token from secret file located at [" + ghPTokenSecretFilePath + "] / ghPTokenSecret = [" + ghPTokenSecret + "]");


  // pokus msg
  const pokusmsg = `Pokus: le lien [${event.body.name}] a pour valeur [${event.body.url}] + Github Personal Access Token = [${ghPTokenSecret}]`
  const result = {
    'body': JSON.stringify(event.body),
    'content-type': event.headers["content-type"],
    'pokus': 'faas-node16',
    'ghPTokenSecret': `${ghPTokenSecret}`,
    'pokusmsg': `${pokusmsg}`
    /* 'event': event,
       'context': context
    */
  }

  return context
    .status(200)
    .succeed(result)
}

// https://docs.openfaas.com/tutorials/cli-with-node/

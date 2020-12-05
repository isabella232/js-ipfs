'use strict'

const CID = require('cids')
const Client = require('../../lib/core')
const Service = require('./service')
const toUrlSearchParams = require('../../lib/to-url-search-params')

/**
 * @typedef {import('../..').HttpOptions} HttpOptions
 * @typedef {import('../../lib/core').ClientOptions} ClientOptions
 * @typedef {import('interface-ipfs-core/type/basic').AbortOptions} AbortOptions
 * @typedef {import('interface-ipfs-core/type/pin/remote').API} API
 * @typedef {import('interface-ipfs-core/type/pin/remote').Pin} Pin
 * @typedef {import('interface-ipfs-core/type/pin/remote').AddOptions} AddOptions
 * @typedef {import('interface-ipfs-core/type/pin/remote').Query} Query
 *
 * @implements {API}
 */
class Remote {
  /**
   * @param {ClientOptions} options
   */
  constructor (options) {
    /** @private */
    this.client = new Client(options)
    /** @readonly */
    this.service = new Service(options)
  }

  /**
   * Stores an IPFS object(s) from a given path to a remote pinning service.
   *
   * @param {CID} cid
   * @param {AddOptions & AbortOptions & HttpOptions} options
   * @returns {Promise<Pin>}
   */
  add (cid, options) {
    return Remote.add(this.client, cid, options)
  }

  /**
   * @param {Client} client
   * @param {CID} cid
   * @param {AddOptions & AbortOptions & HttpOptions} options
   */
  static async add (client, cid, { timeout, signal, headers, ...options }) {
    const { name, origins, background, service } = options
    const response = await client.post('pin/remote/add', {
      timeout,
      signal,
      headers,
      searchParams: toUrlSearchParams({
        arg: cid.toString(),
        service,
        name,
        origins,
        background
      })
    })

    return Remote.decodePin(await response.json())
  }

  /**
   * @param {Object} json
   * @returns {Pin}
   */
  static decodePin ({ Name: name, Status: status, Cid: cid }) {
    return {
      cid: new CID(cid),
      name,
      status
    }
  }

  /**
   * Returns a list of matching pins on the remote pinning service.
   *
   * @param {Query & AbortOptions & HttpOptions} query
   */
  ls (query) {
    return Remote.ls(this.client, query)
  }

  /**
   *
   * @param {Client} client
   * @param {Query & AbortOptions & HttpOptions} options
   * @returns {AsyncIterable<Pin>}
   */
  static async * ls (client, { timeout, signal, headers, ...query }) {
    const response = await client.post('pin/remote/ls', {
      signal,
      timeout,
      headers,
      searchParams: Remote.encodeQuery(query)
    })

    for await (const pin of response.ndjson()) {
      yield Remote.decodePin(pin)
    }
  }

  /**
   * @param {Query & { all?: boolean }} query
   * @returns {URLSearchParams}
   */
  static encodeQuery ({ service, cid, name, match, status, all }) {
    return toUrlSearchParams({
      service,
      name,
      match,
      status,
      force: all ? true : undefined,
      cid: cid && cid.map(String)
    })
  }

  /**
   * Removes a single pin object matching query allowing it to be garbage
   * collected (if needed). Will error if multiple pins mtach provided
   * query. To remove all matches use `rmAll` instead.
   *
   * @param {Query & AbortOptions & HttpOptions} query
   */
  rm (query) {
    return Remote.rm(this.client, { ...query, all: false })
  }

  /**
   * Removes all pin object that match given query allowing them to be garbage
   * collected if needed.
   *
   * @param {Query & AbortOptions & HttpOptions} query
   */
  rmAll (query) {
    return Remote.rm(this.client, { ...query, all: true })
  }

  /**
   *
   * @param {Client} client
   * @param {{all: boolean} & Query & AbortOptions & HttpOptions} options
   */
  static async rm (client, { timeout, signal, headers, ...query }) {
    await client.post('pin/remote/rm', {
      timeout,
      signal,
      headers,
      searchParams: Remote.encodeQuery(query)
    })
  }
}

module.exports = Remote

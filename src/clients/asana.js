const asana = require('asana')
const get = require('lodash/get')

const config = require('../utils/config')

const pathToken                     = 'clients.asana.access-token'
const pathProject                   = 'clients.asana.project'
const pathUser                      = 'clients.asana.user'
const pathWorkspaceOrganization     = 'clients.asana.workspace'
const pathTeam                      = 'clients.asana.team'
const pathSectionToDo               = 'clients.asana.sections.to-do'
const pathSectionInProgress         = 'clients.asana.sections.in-progress'
const pathSectionReadyForProduction = 'clients.asana.sections.ready-for-production'
const pathSectionDone               = 'clients.asana.sections.done'


const createClient = () => {
  const token = config.get(pathToken)
  return asana.Client.create()
    .useAccessToken(token)
}

class Client {
  constructor() {
    this.asana = createClient()
  }

  async getToDoTasks() {
    try {
      /* eslint-disable camelcase */
      const params = {
        section: config.get(pathSectionToDo),
        opt_fields: 'name,assignee',
      }
      /* eslint-enable */
      const myId = config.get(pathUser)

      const { data } = await this.asana.tasks.findAll(params)

      // return my assigned tasks
      return data.filter((x) => get(x, 'assignee.id') === myId)
    } catch (error) {
      throw error
    }
  }
}

module.exports = {
  Client,
  createClient,
  pathToken,
  pathProject,
  pathUser,
  pathWorkspaceOrganization,
  pathTeam,
  pathSectionToDo,
  pathSectionInProgress,
  pathSectionReadyForProduction,
  pathSectionDone,
}


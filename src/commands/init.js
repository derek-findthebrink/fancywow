const { Command } = require('@oclif/command')
const inquirer = require('inquirer')
const asana = require('asana')

const config = require('../utils/config')


// accessors
const pathToken                 = 'clients.asana.access-token'
const pathUser                  = 'clients.asana.user'
const pathWorkspaceOrganization = 'clients.asana.workspace'
const pathTeam                  = 'clients.asana.team'
const pathProject               = 'clients.asana.project'


// helpers
const createAsanaClient = () => {
  const token = config.get(pathToken)
  return asana.Client.create()
    .useAccessToken(token)
}

const inquirePromptOverwriteIfSet = (path) => {
  if (!config.has(path)) {
    return Promise.resolve(true)
  }
  return inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Would you like to overwrite: ${path}?`,
    default: false,
  }).then(({ confirm }) => confirm)
}

const sortObjectsByName = (col) =>
  col.sort((a, b) =>
    a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase())
  )


// questions
// -------------------------------------------------------
const promptAsanaToken = {
  name: 'clientAsanaToken',
  type: 'input',
  message: 'What is your asana personal token?',
}

const promptWorkspace = {
  name: 'clientAsanaWorkspace',
  type: 'list',
  message: 'Which workspace do you want to use?',
  choices: () => {
    // create asana client
    const client = createAsanaClient()

    // request all workspaces
    return client.workspaces.findAll()
      .then((workspaces) => {
        return sortObjectsByName(workspaces.data)
          .map((ws) => ({ name: ws.name, value: ws.id }))
      })
      .catch((error) => {
        throw error
      })
  },
}

const promptTeam = {
  name: 'clientAsanaTeam',
  type: 'list',
  message: 'Which team would you like to use?',
  choices: () => {
    // create asana client
    const client = createAsanaClient()

    // request all workspaces
    // TODO: ensure that workspace is organization at this point
    return client.teams.findByOrganization(config.get(pathWorkspaceOrganization))
      .then((teams) =>
        sortObjectsByName(teams.data)
          .map((ws) => ({ name: ws.name, value: ws.id }))
      )
      .catch((error) => {
        throw error
      })
  },
}

const promptProject = {
  name: 'clientAsanaProject',
  type: 'list',
  message: 'Which project would you like to use?',
  choices: () => {
    const client = createAsanaClient()

    const params = {
      workspace: config.get(pathWorkspaceOrganization),
      team: config.get(pathTeam),
    }

    // request all projects
    return client.projects.findAll(params)
      .then((projects) =>
        sortObjectsByName(projects.data)
          .map((x) => ({ name: x.name, value: x.id }))
      )
  },
}

const createNormalizedConfigStructure = (path, prompt) => ({ path, prompt })

const pathClientType = 'clients.type'

const promptClientType = {
  name: 'clientType',
  type: 'list',
  message: 'Which client would you like to use?',
  choices: [
    'asana',
  ],
}

const configPrompts = {
  clientType: createNormalizedConfigStructure(pathClientType, promptClientType),
  token: createNormalizedConfigStructure(pathToken, promptAsanaToken),
  workspace: createNormalizedConfigStructure(pathWorkspaceOrganization, promptWorkspace),
  team: createNormalizedConfigStructure(pathTeam, promptTeam),
  project: createNormalizedConfigStructure(pathProject, promptProject),
}

const requestValue = async ({ path, prompt }) => {
  try {
    const doIt = await inquirePromptOverwriteIfSet(path)
    if (doIt) {
      // set name to predictable outcome
      prompt.name = 'answer'
      return await inquirer.prompt([ prompt ])
        .then(({ answer }) => answer)
    }
    return await Promise.resolve(config.get(path))
  } catch (error) {
    throw error
  }
}

const writeRequestedValue = async (promptPathObject) => {
  try {
    const value = await requestValue(promptPathObject)
    config.set(promptPathObject.path, value)
    return value
  } catch (error) {
    throw error
  }
}

const isDifferentFromConfig = (path, value) => config.get(path) !== value


// command
// --------------------------------------------------------
class InitCommand extends Command {
  async run() {
    try {
      // Prompt client type
      await writeRequestedValue(configPrompts.clientType)

      // the following is asana-specific
      const token = await writeRequestedValue(configPrompts.token)

      // write the user based on the incoming asana token
      if (isDifferentFromConfig(pathToken, token)) {
        const user = await createAsanaClient()
          .projects.users.me()
          .then(u => u.id)
        config.set(pathUser, user)
      }

      await writeRequestedValue(configPrompts.workspace)
      await writeRequestedValue(configPrompts.team)
      await writeRequestedValue(configPrompts.project)
    } catch (error) {
      this.error(error, { exit: 1 })
    } finally {
      this.log(config.all)
    }
  }
}

InitCommand.description = `Initialize fancywow
...
Set your task provider credentials and project!
`

InitCommand.flags = {}

module.exports = InitCommand

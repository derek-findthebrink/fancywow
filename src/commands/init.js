const { Command } = require('@oclif/command')
const inquirer = require('inquirer')
const prettyjson = require('prettyjson')

const {
  createClient: createAsanaClient,
  pathToken,
  pathProject,
  pathUser,
  pathWorkspaceOrganization,
  pathTeam,
  pathSectionToDo,
  pathSectionInProgress,
  pathSectionReadyForProduction,
  pathSectionDone,
} = require('../clients/asana')

const config = require('../utils/config')


const pathClientType = 'clients.type'


// helpers
// -------------------------------------------------------
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

// findAll only first
const createResourceListPrompt = (message, resource, method, getParamsFn) => ({
  type: 'list',
  message,
  choices: () => {
    let params
    let resourceMethod = 'findAll'
    if (getParamsFn && typeof getParamsFn === 'function') {
      params = getParamsFn()
    }
    if (method) {
      resourceMethod = method
    }

    const client = createAsanaClient()
    return client[resource][resourceMethod](params)
      .then((res) =>
        sortObjectsByName(res.data)
          .map((x) => ({ name: x.name, value: x.id }))
      )
      .catch((error) => {
        throw error
      })
  },
})

function listSections() {
  const client = createAsanaClient()
  return client.sections.findByProject(config.get(pathProject))
    .then((data) => {
      return data.map((ws) => ({ name: ws.name, value: ws.id }))
    })
    .catch((error) => {
      throw error
    })
}

const createNormalPrompt = (path, prompt) => ({ path, prompt })

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


// questions
// -------------------------------------------------------
const promptClientType = {
  name: 'clientType',
  type: 'list',
  message: 'Which client would you like to use?',
  choices: [
    'asana',
  ],
}

const promptAsanaToken = {
  name: 'clientAsanaToken',
  type: 'input',
  message: 'What is your asana personal token?',
}

const promptWorkspace = createResourceListPrompt(
  'Which workspace do you want to use?',
  'workspaces'
)

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

const promptProject = createResourceListPrompt(
  'Which project would you like to use?',
  'projects',
  'findAll',
  () => ({
    workspace: config.get(pathWorkspaceOrganization),
    team: config.get(pathTeam),
  })
)

const promptSectionToDo = {
  type: 'list',
  message: 'Which section corresponds to your "To Do" list?',
  choices: listSections,
}

const promptSectionInProgress = {
  type: 'list',
  message: 'Which section corresponds to your "In Progress" list?',
  choices: listSections,
}

const promptSectionReadyForProduction = {
  type: 'list',
  message: 'Which section corresponds to your "Ready for Production" list?',
  choices: listSections,
}

const promptSectionDone = {
  type: 'list',
  message: 'Which section corresponds to your "Done" list?',
  choices: listSections,
}

const configPrompts = {
  clientType: createNormalPrompt(pathClientType, promptClientType),
  token: createNormalPrompt(pathToken, promptAsanaToken),
  workspace: createNormalPrompt(pathWorkspaceOrganization, promptWorkspace),
  team: createNormalPrompt(pathTeam, promptTeam),
  project: createNormalPrompt(pathProject, promptProject),
  sections: {
    toDo: createNormalPrompt(pathSectionToDo, promptSectionToDo),
    inProgress: createNormalPrompt(pathSectionInProgress, promptSectionInProgress),
    readyForProduction: createNormalPrompt(pathSectionReadyForProduction, promptSectionReadyForProduction),
    done: createNormalPrompt(pathSectionDone, promptSectionDone),
  },
}


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
      await writeRequestedValue(configPrompts.sections.toDo)
      await writeRequestedValue(configPrompts.sections.inProgress)
      await writeRequestedValue(configPrompts.sections.readyForProduction)
      await writeRequestedValue(configPrompts.sections.done)
    } catch (error) {
      this.error(error, { exit: 1 })
    } finally {
      this.log(prettyjson.render(config.all))
    }
  }
}

InitCommand.description = `Initialize fancywow
...
Set your task provider credentials and project!
`

InitCommand.flags = {}

module.exports = InitCommand

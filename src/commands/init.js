const {
  Command,
} = require('@oclif/command')

const inquirer = require('inquirer')
const asana = require('asana')

const config = require('../utils/config')


// accessors
const tokenPath                 = 'clients.asana.access-token'
const userPath                  = 'clients.asana.user'
const workspaceOrganizationPath = 'clients.asana.workspace'
const teamPath                  = 'clients.asana.team'
const projectPath               = 'clients.asana.project'


// helpers
const createAsanaClient = () => {
  const token = config.get(tokenPath)
  return asana.Client.create()
    .useAccessToken(token)
}

const promptOverwriteIfSet = (path) => {
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
  name: 'asanaToken',
  type: 'input',
  message: 'What is your asana personal token?',
}

const promptWorkspace = {
  name: 'asanaWorkspace',
  type: 'list',
  message: 'Which workspace do you want to use?',
  choices: () => {
    // create asana client
    const client = createAsanaClient()

    // request all workspaces
    return client.workspaces.findAll()
      .then((workspaces) => {
        return workspaces.data.map((ws) => ({ name: ws.name, value: ws.id }))
      })
      .catch((error) => {
        throw error
      })
  },
}

const promptTeam = {
  name: 'asanaTeam',
  type: 'list',
  message: 'Which team would you like to use?',
  choices: () => {
    // create asana client
    const client = createAsanaClient()

    // request all workspaces
    // TODO: ensure that workspace is organization at this point
    return client.teams.findByOrganization(config.get(workspaceOrganizationPath))
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
  name: 'asanaProject',
  type: 'list',
  message: 'Which project would you like to use?',
  choices: () => {
    const client = createAsanaClient()

    const params = {
      workspace: config.get(workspaceOrganizationPath),
      team: config.get(teamPath),
    }

    // request all projects
    return client.projects.findAll(params)
      .then((projects) =>
        sortObjectsByName(projects.data)
          .map((x) => ({ name: x.name, value: x.id }))
      )
  },
}


// command
// --------------------------------------------------------
class InitCommand extends Command {
  async run() {
    try {
      // set access token
      if (await promptOverwriteIfSet(tokenPath)) {
        const authToken = await this.getAuthToken()
        config.set(tokenPath, authToken)
      }

      // set user (from access token, just get the id)
      const client = createAsanaClient()
      const userId = await client.users.me()
        .then((user) => user.id)
      config.set(userPath, userId)

      // set workspace
      if (await promptOverwriteIfSet(workspaceOrganizationPath)) {
        const workspace = await this.getWorkspace()
        config.set(workspaceOrganizationPath, workspace)
      }

      // set team
      if (await promptOverwriteIfSet(teamPath)) {
        const team = await this.getTeam()
        config.set(teamPath, team)
      }

      // set project
      if (await promptOverwriteIfSet(projectPath)) {
        const project = await this.getProject()
        config.set(projectPath, project)
      }

      // set project
    } catch (error) {
      this.error(error, { exit: 1 })
    } finally {
      this.log(config.all)
    }
  }

  getAuthToken() {
    return inquirer.prompt([ promptAsanaToken ])
      .then(answers => answers[promptAsanaToken.name])
  }

  getWorkspace() {
    return inquirer.prompt([ promptWorkspace ])
      .then((answers) => answers.asanaWorkspace)
  }

  getTeam() {
    return inquirer.prompt([ promptTeam ])
      .then((answers) => answers.asanaTeam)
  }

  getProject() {
    return inquirer.prompt([ promptProject ])
      .then((answers) => answers.asanaProject)
  }
}

InitCommand.description = `Initialize fancywow
...
Set your task provider credentials and project!
`

InitCommand.flags = {
  // name: flags.string({char: 'n', description: 'name to print'}),
}

module.exports = InitCommand

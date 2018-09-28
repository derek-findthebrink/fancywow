const { expect, test } = require('@oclif/test')

describe('tasks', () => {
  test
    .stdout()
    .command([ 'tasks' ])
    .it('runs hello', ctx => {
      expect(ctx.stdout).to.contain('hello world')
    })

  test
    .stdout()
    .command([ 'tasks', '--name', 'jeff' ])
    .it('runs hello --name jeff', ctx => {
      expect(ctx.stdout).to.contain('hello jeff')
    })
})

import { promises as fs } from 'fs'
import core from '@actions/core'
import { context, getOctokit } from '@actions/github'

import { parse } from './lcov'
import { diff } from './comment'

async function main () {
  const token = core.getInput('github-token')
  const lcovFile = core.getInput('lcov-file') || './coverage/lcov.info'
  const baseFile = core.getInput('lcov-base')

  const raw = await fs.readFile(lcovFile, 'utf-8').catch(_ => null)
  if (!raw) {
    console.log(`No coverage report found at '${lcovFile}', exiting...`)
    return
  }

  const baseRaw = baseFile && await fs.readFile(baseFile, 'utf-8').catch(_ => null)
  if (baseFile && !baseRaw) {
    console.log(`No coverage report found at '${baseFile}', ignoring...`)
  }

  const octokit = getOctokit(token)

  let changedFiles
  try {
    const { data } = changedFiles = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
      repo: context.repo.repo,
      owner: context.repo.owner,
      pull_number: context.payload.pull_request.number
    })
    changedFiles = data.map((item) => (item.filename))
  } catch (err) {
    console.error('Error fetching pull request changed files')
  }

  console.log(changedFiles)

  const options = {
    repository: context.payload.repository.full_name,
    prefix: `${process.env.GITHUB_WORKSPACE}/`,
    changedFiles: changedFiles || [],
    only: core.getInput('only')
  }

  if (context.eventName === 'pull_request') {
    options.commit = context.payload.pull_request.head.sha
    options.head = context.payload.pull_request.head.ref
    options.base = context.payload.pull_request.base.ref
  } else if (context.eventName === 'push') {
    options.commit = context.payload.after
    options.head = context.ref
  }

  const lcov = await parse(raw)
  const baselcov = baseRaw && await parse(baseRaw)
  // const body = diff(lcov, baselcov, options)

  if (context.eventName === 'pull_request') {
    await octokit.rest.issues.createComment({
      repo: context.repo.repo,
      owner: context.repo.owner,
      issue_number: context.payload.pull_request.number,
      body: diff(lcov, baselcov, options)
    })
  } else if (context.eventName === 'push') {
    await octokit.rest.repos.createCommitComment({
      repo: context.repo.repo,
      owner: context.repo.owner,
      commit_sha: options.commit,
      body: diff(lcov, baselcov, options)
    })
  }
}

main().catch(function (err) {
  console.log(err)
  core.setFailed(err.message)
})

const path = require('path')
const express = require('express')
const xss = require('xss')
const ProjectsService = require('./projects-service')

const projectsRouter = express.Router()
const jsonParser = express.json()

const serializeProject = project => ({
  id: project.id,
  name: xss(project.name),
  description: xss(project.description),
  features: xss(project.features),
  author: xss(project.author),
  topic: xss(project.topic),
  date_created: project.date_created
})

projectsRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    ProjectsService.getAllProjects(knexInstance)
      .then(projects => {
        res.json(projects.map(serializeProject))
      })
      .catch(next)
  })
  .post(jsonParser, (req, res, next) => {
    const { name, description, features, topic, author, date_created  } = req.body
    const newProject = { name, description   }

    for (const [key, value] of Object.entries(newProject)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        })
      }
    }

    newProject.features = features;
    newProject.topic = topic;
    newProject.author = author;
    newProject.date_created = date_created;

    ProjectsService.insertProject(
      req.app.get('db'),
      newProject
    )
      .then(project => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${project.id}`))
          .json(serializeProject(project))
      })
      .catch(next)
  })

  projectsRouter
  .route('/:project_id')
  .all((req, res, next) => {
    ProjectsService.getById(
      req.app.get('db'),
      req.params.project_id
    )
      .then(project => {
        if (!project) {
          return res.status(404).json({
            error: { message: `project doesn't exist` }
          })
        }
        res.project = project
        next()
      })
      .catch(next)
  })

  .get((req, res, next) => {
    res.json(serializeProject(res.project))
  })

  .delete((req, res, next) => {
    ProjectsService.deleteProject(
      req.app.get('db'),
      req.params.project_id
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })

  .patch(jsonParser, (req, res, next) => {
    const { name, description } = req.body
    const projectToUpdate = { name, description }

    const numberOfValues = Object.values(projectToUpdate).filter(Boolean).length
    if (numberOfValues === 0)
      return res.status(400).json({
        error: {
          message: `Request body must contain either 'name', 'description', or 'date_created'`
        }
      })

    ProjectsService.updateProject(
      req.app.get('db'),
      req.params.project_id,
      projectToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = projectsRouter
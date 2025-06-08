const { title } = require("process")

require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
}

exports.createSchemaCustomization = ({ actions, schema }) => {
  const { createTypes } = actions
  const typeDefs = [
    schema.buildObjectType({
      name: "Mdx",
      fields: {
        title: {
          type: "String",
          resolve(source, args, context, info) {
            const frontmatter = source.frontmatter || {}
            const title = frontmatter.title
            if (typeof title !== "undefined" && title !== null && title.length > 0) {
              return title
            }

            const fallbackTitle = "[Untitled]"

            const parentNode = context.nodeModel.getNodeById({
              id: source.parent,
            })
            if (!parentNode) {
              return fallbackTitle
            }

            const filename = parentNode.name || ""
            const titleFromFilename = filename
              .replace(/-/g, " ")
              .replace(/\.mdx?$/, "")
              .replace(/\.md$/, "")
              .trim()

            if (!titleFromFilename || titleFromFilename.length === 0) {
              return fallbackTitle
            }

            return toTitleCase(titleFromFilename)
          },
        },
        postFilePath: {
          type: "String",
          resolve(source, args, context, info) {
            const parent = context.nodeModel.getNodeById({
              id: source.parent,
            })
            if (!parent) {
              return source.id
            }

            const fileRelativeDir = parent.relativeDirectory
            const filename = parent.name
            const postFilePath = fileRelativeDir ? `${fileRelativeDir}/${filename}` : filename
            return postFilePath
          },
        },
      },
    }),
  ]
  createTypes(typeDefs)
}

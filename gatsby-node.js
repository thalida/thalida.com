exports.createSchemaCustomization = ({ actions, schema }) => {
  const { createTypes } = actions
  const typeDefs = [
    "type Mdx implements Node { frontmatter: Frontmatter }",
    schema.buildObjectType({
      name: "Frontmatter",
      fields: {
        tags: {
          type: "[String!]",
        },
        category: {
          type: "String",
          resolve(source, args, context, info) {
            const { category } = source
            // const field = source[info.fieldName]
            // // console.log("context", context.nodeModel)

            // // get current directory path
            // const currentPath = context.nodeModel.getNodeById({ id: source.parent }).dir
            // console.log("currentPath", currentPath)

            // if (field == null || !field.length) {
            //   console.log("No category found for this post", field)
            //   console.log("source parent folder:", source.parent)
            //   console.log("source:", source)
            //   console.log("info:", info)
            //   return null
            // }
            return category
          },
        },
      },
    }),
  ]
  createTypes(typeDefs)
}

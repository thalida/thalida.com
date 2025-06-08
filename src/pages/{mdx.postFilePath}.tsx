import * as React from 'react'
import type { HeadFC, PageProps } from "gatsby"
import { graphql } from 'gatsby'


const BlogPost: React.FC<PageProps> = ({ data, children }) => {
  console.log("Rendering BlogPost component with data:", data);
  return (
    <main>
      <h1>{data.mdx.title}</h1>
      <p>{data.mdx.frontmatter.date}</p>
      {children}
    </main>
  )
}

export const query = graphql`
  query ($id: String) {
    mdx(id: {eq: $id}) {
      frontmatter {
        date(formatString: "MMMM D, YYYY")
      }
      title
      postFilePath
    }
  }
`

export default BlogPost

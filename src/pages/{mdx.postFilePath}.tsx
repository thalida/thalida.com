import * as React from 'react'
import type { HeadFC, PageProps } from "gatsby"
import { graphql } from 'gatsby'


const BlogPost: React.FC<PageProps> = ({ data, children }) => {
  console.log("Rendering BlogPost component with data:", data);
  const isIndex = data.mdx.postFilePath.endsWith("/index")
  console.log("Is index page:", isIndex);

  if (isIndex) {
    return (
      <article className="prose lg:prose-xl">
        {data.mdx.children.map((child) => (
          <div key={child.id}>
            <h2>{child.title}</h2>
            <p>{child.frontmatter.date}</p>
            <p>{child.postFilePath}</p>
          </div>
        ))}
        {children}
      </article>
    )
  }

  return (
    <article className="prose lg:prose-xl">
      <h1>{data.mdx.title}</h1>
      <p>{data.mdx.frontmatter.date}</p>
      {children}
    </article>
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
      children {
        ... on Mdx {
          id
          frontmatter {
            date(formatString: "MMMM D, YYYY")
          }
          title
          postFilePath
        }
      }
    }
  }
`

export default BlogPost

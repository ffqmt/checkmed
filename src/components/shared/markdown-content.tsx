"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Docs cross-link each other with plain relative Markdown paths
 * (`../produto/como-funciona.md`, `checklist-avaliacao.md`, `casos-de-estudo/`)
 * written for a file browser, not this app. Resolving them against the
 * current doc's folder keeps "Ver também" sections clickable instead of
 * turning into dead links inside the viewer.
 */
function resolveDocLink(basePath: string, href: string): string {
  let target = href.endsWith("/") ? `${href}README` : href;
  target = target.replace(/\.md$/, "");

  const segments = basePath ? basePath.split("/") : [];
  for (const part of target.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") segments.pop();
    else segments.push(part);
  }
  return segments.join("/");
}

export function MarkdownContent({ content, basePath }: { content: string; basePath: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="table-wrap">
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) => {
            if (href && !/^(https?:|mailto:)/.test(href)) {
              const [pathPart, hash] = href.split("#");
              const resolved = resolveDocLink(basePath, pathPart);
              return <Link href={`/ops/documentacao/${resolved}${hash ? `#${hash}` : ""}`}>{children}</Link>;
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

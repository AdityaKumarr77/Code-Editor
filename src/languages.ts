export type LangId = "javascript" | "typescript" | "html" | "css" | "python" | "cpp" | "java" | "json";

export interface Lang {
  label: string;
  ext: string;
  runnable: boolean;
  sample: string;
}

export const LANGS: Record<LangId, Lang> = {
  javascript: {
    label: "JavaScript",
    ext: "js",
    runnable: true,
    sample: `const fib = (n) => (n < 2 ? n : fib(n - 1) + fib(n - 2));

for (let i = 0; i < 10; i++) {
  console.log("fib(" + i + ") =", fib(i));
}
`,
  },
  typescript: {
    label: "TypeScript",
    ext: "ts",
    runnable: true,
    sample: `interface Student {
  name: string;
  marks: number[];
}

const average = (s: Student): number =>
  s.marks.reduce((a, b) => a + b, 0) / s.marks.length;

const aditya: Student = { name: "Aditya", marks: [88, 92, 95] };
console.log(aditya.name, "average:", average(aditya).toFixed(2));
`,
  },
  html: {
    label: "HTML",
    ext: "html",
    runnable: true,
    sample: `<!doctype html>
<html>
  <body style="font-family: sans-serif; padding: 24px">
    <h1>Hello from Aditya Editor</h1>
    <button onclick="this.textContent = 'Clicked!'">Click me</button>
  </body>
</html>
`,
  },
  css: { label: "CSS", ext: "css", runnable: false, sample: `body {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n}\n` },
  python: { label: "Python", ext: "py", runnable: false, sample: `def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("Aditya"))\n` },
  cpp: {
    label: "C++",
    ext: "cpp",
    runnable: false,
    sample: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, Aditya!" << endl;\n    return 0;\n}\n`,
  },
  java: {
    label: "Java",
    ext: "java",
    runnable: false,
    sample: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Aditya!");\n    }\n}\n`,
  },
  json: { label: "JSON", ext: "json", runnable: false, sample: `{\n  "name": "Aditya",\n  "role": "Developer"\n}\n` },
};

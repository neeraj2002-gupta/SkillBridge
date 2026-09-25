import { Link } from "@tanstack/react-router";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row md:px-6">
        <p>
          © {new Date().getFullYear()} SkillBridge. Built by{" "}
          <a
            href="https://www.linkedin.com/in/neerajgupta-dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:underline hover:text-primary transition-colors"
          >
            neerajgupta-dev
          </a>
        </p>
        <div className="flex gap-4 text-xs font-medium">
          <Link to="/match" className="hover:text-primary transition-colors">
            Match
          </Link>
          <Link to="/premium" className="hover:text-primary transition-colors">
            Premium
          </Link>
          <Link to="/profile" className="hover:text-primary transition-colors">
            Profile
          </Link>
        </div>
      </div>
    </footer>
  );
}

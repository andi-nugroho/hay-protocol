export const Footer = () => {
  return (
    <footer className="border-t-2 border-border mt-10">
      <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} HayyProtocol</p>
        <nav className="flex items-center gap-4">
          <a href="#" className="story-link text-sm">About</a>
          <a href="#" className="story-link text-sm">Docs</a>
          <a href="#" className="story-link text-sm">GitHub</a>
        </nav>
      </div>
    </footer>
  );
};

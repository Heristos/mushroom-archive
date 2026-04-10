type TitleSidebarProps = {
  title?: string;
};

export default function TitleSidebar({ title }: TitleSidebarProps) {
  return (
    <div
      className="bg-(--color-main) flex flex-col p-1"
      style={{
        boxShadow:
          "inset 3px 3px 0px var(--light-main), inset -3px -3px 0px var(--dark-main)",
      }}
    >
      <h2 className="text-white font-bold text-lg text-center">{title}</h2>
    </div>
  );
}

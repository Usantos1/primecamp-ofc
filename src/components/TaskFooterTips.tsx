export const TaskFooterTips = () => {
  return (
    <div className="hidden md:block w-full max-w-5xl mx-auto mt-8 px-4">
      <div className="bg-muted/30 text-muted-foreground p-6 rounded-lg border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <p className="font-semibold mb-3 text-base">📋 Ações Rápidas</p>
            <ul className="space-y-2 list-disc ml-5">
              <li>Clique no <b>título</b> para visualizar a tarefa.</li>
              <li>Ícone de <b>lápis</b>: editar.</li>
              <li>Ícone de <b>lixeira</b>: excluir.</li>
              <li>Menu <b>status</b>: alterar andamento.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-3 text-base">🧠 Dicas Importantes</p>
            <ul className="space-y-2 list-disc ml-5">
              <li>Data mostra o <b>prazo</b> da tarefa.</li>
              <li>Responsável e categoria aparecem abaixo.</li>
              <li>Cada tarefa deve ser <b>vinculada a um processo</b>.</li>
              <li className="text-red-500 italic">Tarefas em vermelho estão atrasadas.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
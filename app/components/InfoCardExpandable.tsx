"use client";

import { useState } from "react";
import { HiChevronDown } from "react-icons/hi2";

export default function InfoCardExpandable() {
  const [open, setOpen] = useState(false); // começa fechado

  return (
    <div
      data-open={open}
      className="
        flex flex-col relative overflow-hidden h-auto text-foreground box-border
        bg-content1 outline-solid outline-transparent
        data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2
        data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2
        shadow-medium rounded-large transition-transform-background motion-reduce:transition-none
        hover:shadow-lg hover:scale-[1.02] cursor-pointer
      "
      tabIndex={-1}
    >
      {/* Header / botão */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="info-card-content"
        onClick={() => setOpen((v) => !v)}
        className="
          flex p-3 z-10 w-full justify-between items-center shrink-0
          overflow-inherit color-inherit subpixel-antialiased rounded-t-large
          select-none hover:bg-default-100 transition-colors duration-200
        "
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Dicas e Orientações</h3>
          <span className="text-xs text-gray-500 block sm:text-sm">Clique para mais informações</span>
        </div>
        <HiChevronDown
          className="
            transition-transform duration-300 ease-out
            data-[open=true]:rotate-180
          "
          data-open={open}
          aria-hidden="true"
        />
      </button>

      {/* Conteúdo com animação de altura automática */}
      <div
        id="info-card-content"
        className={`
          grid overflow-hidden
          transition-[grid-template-rows,opacity] duration-300 ease-out
          ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}
        `}
      >
        <div className="overflow-hidden">
          <div className="relative flex w-full p-3 flex-auto flex-col place-content-inherit align-items-inherit h-auto break-words text-left overflow-y-auto subpixel-antialiased">
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>A tag da organização deve ser única e não pode ser alterada após outros membros se juntarem</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>O logo deve ser uma URL válida de uma imagem (PNG, JPG, GIF)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Organizações públicas são visíveis para todos, enquanto privadas só aparecem para membros</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Apenas o Owner da organização pode editar essas configurações</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
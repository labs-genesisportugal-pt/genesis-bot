import { SidebarTab } from "@/lib/types";
import { TbTools, TbShield, TbHorseToy } from "react-icons/tb";
import Embeds from "@/app/dashboard/[guildId]/[category]/categoryComponents/embeds";
import Triggers from "../dashboard/[guildId]/[category]/categoryComponents/triggers";
import Starboard from "../dashboard/[guildId]/[category]/categoryComponents/starboard";

export const tabs: Record<string, SidebarTab> = {
  Útil: {
    icon: TbTools,
    subTabs: [
      {
        name: "Embeds",
        path: "/embeds",
        content: Embeds,
      },
    ],
  },
  Moderação: {
    icon: TbShield,
    subTabs: [
      {
        name: "Pote de Mel",
        path: "/honeypot",
        content: Embeds,
      },
    ],
  },
  Entretenimento: {
    icon: TbHorseToy,
    subTabs: [
      {
        name: "Níveis",
        path: "/levels",
        content: Embeds,
      },
      {
        name: "Gatilhos",
        path: "/triggers",
        content: Triggers,
      },
      { 
        name: "Starboard",
        path: "/starboard",
        content: Starboard,
      },
    ],
  },
};

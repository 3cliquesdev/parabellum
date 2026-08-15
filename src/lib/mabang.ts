import mysql from "mysql2/promise";

const ORDER_STATUS_LABEL: Record<string, string> = {
  "1": "aguardando_envio",
  "2": "em_preparacao",
  "3": "enviado",
  "4": "entregue",
  "5": "cancelado",
  "6": "devolvido",
};

export interface PedidoArmazem {
  platform_order_id: string;
  order_status_codigo: string | null;
  order_status: string;
  buyer_name: string | null;
  track_number: string | null;
  remark: string | null;
  paid_time: string | null;
  transport_time: string | null;
  express_time: string | null;
  update_time: string | null;
}

async function conectar() {
  return mysql.createConnection({
    host: process.env.MYSQL_HOST!,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER!,
    password: process.env.MYSQL_PASSWORD!,
    database: process.env.MYSQL_DATABASE!,
    connectTimeout: 8000,
  });
}

/**
 * Busca um pedido no Mabang WMS (Seu Armazem Drop) por numero de pedido ou
 * codigo de rastreio informado pelo cliente. O numero visivel ao cliente
 * normalmente aparece no campo `remark` no formato "loja#12345".
 */
export async function buscarPedidoArmazem(numero: string): Promise<PedidoArmazem | null> {
  if (!process.env.MYSQL_HOST) return null;
  const termo = numero.trim();
  if (!termo) return null;

  const conn = await conectar();
  try {
    const selectFields = `platform_order_id, order_status, buyer_name, track_number, track_number_internal,
              track_number_virtual, remark, paid_time, transport_time, express_time, update_time`;

    // Prioriza matches exatos (numero do pedido visivel ao cliente costuma ser
    // o sufixo "loja#NNNNN" em remark, ou o codigo de rastreio exato) antes de
    // tentar um LIKE mais solto que pode casar com um substring de outro pedido.
    const tentativas: Array<[string, unknown[]]> = [
      [`SELECT ${selectFields} FROM mabang_order WHERE remark LIKE ? ORDER BY create_date DESC LIMIT 1`, [`%#${termo}`]],
      [`SELECT ${selectFields} FROM mabang_order WHERE track_number = ? OR track_number_internal = ? OR track_number_virtual = ? ORDER BY create_date DESC LIMIT 1`, [termo, termo, termo]],
      [`SELECT ${selectFields} FROM mabang_order WHERE platform_order_id = ? ORDER BY create_date DESC LIMIT 1`, [termo]],
      [`SELECT ${selectFields} FROM mabang_order WHERE platform_order_id LIKE ? ORDER BY create_date DESC LIMIT 1`, [`%${termo}%`]],
    ];

    let rows: unknown[] = [];
    for (const [sql, params] of tentativas) {
      const [result] = await conn.query(sql, params);
      rows = result as unknown[];
      if (rows.length > 0) break;
    }

    const row = rows[0] as
      | {
          platform_order_id: string;
          order_status: string | null;
          buyer_name: string | null;
          track_number: string | null;
          track_number_internal: string | null;
          track_number_virtual: string | null;
          remark: string | null;
          paid_time: string | null;
          transport_time: string | null;
          express_time: string | null;
          update_time: string | null;
        }
      | undefined;

    if (!row) return null;

    return {
      platform_order_id: row.platform_order_id,
      order_status_codigo: row.order_status,
      order_status: (row.order_status && ORDER_STATUS_LABEL[row.order_status]) || "desconhecido",
      buyer_name: row.buyer_name,
      track_number: row.track_number || row.track_number_internal || row.track_number_virtual,
      remark: row.remark,
      paid_time: row.paid_time,
      transport_time: row.transport_time,
      express_time: row.express_time,
      update_time: row.update_time,
    };
  } finally {
    await conn.end();
  }
}

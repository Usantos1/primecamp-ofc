export type RaffleStatus = 'open' | 'closed' | 'drawn' | 'cancelled';
export type RaffleCouponStatus = 'valid' | 'cancelled' | 'winner';
export type RaffleOrderType = 'sale' | 'service_order';

export interface RaffleSettings {
  id: string;
  company_id?: string | null;
  is_active: boolean;
  campaign_name: string;
  amount_per_coupon: number;
  initial_number: number;
  draw_day_type: 'last_day_of_month' | 'fixed_day';
  fixed_draw_day?: number | null;
  draw_time: string;
  auto_draw_enabled: boolean;
  send_coupon_message_enabled: boolean;
  send_winner_message_enabled: boolean;
  coupon_message_template: string;
  winner_message_template: string;
  prize_description: string;
  prize_value: number;
  prize_validity_days: number;
  prize_redeem_instructions: string;
  rounding_rule: 'complete_value';
  created_at?: string;
  updated_at?: string;
}

export interface Raffle {
  id: string;
  company_id?: string | null;
  raffle_setting_id?: string | null;
  name: string;
  reference_month: number;
  reference_year: number;
  start_date: string;
  end_date: string;
  draw_date: string;
  draw_executed_at?: string | null;
  status: RaffleStatus;
  total_coupons: number;
  total_participants: number;
  eligible_sales_amount: number;
  winning_coupon_id?: string | null;
  winning_customer_id?: string | null;
  prize_description?: string | null;
  prize_value?: number | null;
  prize_validity_days?: number | null;
  prize_redeem_instructions?: string | null;
  draw_origin?: 'automatic' | 'manual' | null;
  drawn_by_user_id?: string | null;
  cancelled_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RaffleCoupon {
  id: string;
  company_id?: string | null;
  raffle_id: string;
  customer_id?: string | null;
  sale_id?: string | null;
  service_order_id?: string | null;
  order_type: RaffleOrderType;
  coupon_number: number;
  eligible_amount: number;
  source_total_amount: number;
  status: RaffleCouponStatus;
  generated_by_user_id?: string | null;
  generated_at: string;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RaffleAuditLog {
  id: string;
  company_id?: string | null;
  raffle_id?: string | null;
  coupon_id?: string | null;
  customer_id?: string | null;
  sale_id?: string | null;
  service_order_id?: string | null;
  user_id?: string | null;
  action: string;
  origin: 'system' | 'user' | 'cron' | 'api';
  old_data?: unknown;
  new_data?: unknown;
  metadata?: unknown;
  ip_address?: string | null;
  created_at: string;
}

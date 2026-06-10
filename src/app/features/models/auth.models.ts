export interface LoginRequest {
	username: string;
	password: string;
}

export interface TokenResponse {
	access: string;
	refresh: string;
}

export interface RegisterEmpresaRequest {
	empresa_nombre: string;
	empresa_nit: string;
	empresa_email: string | null;
	empresa_telefono: string | null;
	empresa_direccion: string | null;
	admin_username: string;
	admin_password: string;
	admin_first_name: string;
	admin_email: string;
	admin_ci: string;
	admin_apellido_p: string;
	admin_apellido_m: string;
	card_number: string | null;
	card_expiry: string | null;
	card_cvc: string | null;
	plan: string;
}

export interface RegisterCompanyRequest {
	empresa_nombre: string;
	empresa_nit: string;
	empresa_email: string | null;
	empresa_telefono: string | null;
	empresa_direccion: string | null;
	card_number: string | null;
	card_expiry: string | null;
	card_cvc: string | null;
	plan: string;
}

export interface RegisterCompanyResponse {
	empresa_id: string;
	empresa_nombre: string;
	registration_token: string;
}

export interface RegisterAdminRequest {
	registration_token: string;
	admin_username: string;
	admin_password: string;
	admin_first_name: string;
	admin_email: string;
	admin_ci: string;
	admin_apellido_p: string;
	admin_apellido_m: string;
}

export interface EmployeeInvitationActivateRequest {
	token: string;
	username: string;
	password: string;
}

export interface DecodedToken {
	sub: string;
	username: string;
	email: string;
	nombre_completo: string;
	role?: string;
	empresa_id: string | null;
	empresa_nombre: string | null;
	roles: string[];
	is_admin: boolean;
	empleado_id: string | null;
	cliente_id?: string | null;
	theme_preference: string | null;
	theme_custom_color: string | null;
	theme_glow_enabled: boolean | null;
	exp: number;
}

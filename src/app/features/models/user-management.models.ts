export interface Permiso {
	id: string;
	nombre: string;
	descripcion: string;
}

export interface Cargo {
	id: string;
	empresa: string;
	nombre: string;
	descripcion: string | null;
}

export interface Servicio {
	id_servicio: string;
	nombre: string;
	descripcion: string | null;
	activo: boolean;
}

export interface Rol {
	id: string;
	empresa: string;
	nombre: string;
	permisos: Permiso[];
}

export interface Usuario {
	id: number;
	username: string;
	first_name: string;
	last_name: string;
	email: string;
	is_active: boolean;
}

export interface Empleado {
	id: string;
	usuario: Usuario;
	ci: string;
	nombre_completo: string;
	direccion: string | null;
	telefono: string | null;
	sueldo: number;
	cargo: string | null;
	empresa: string;
	foto_perfil: string | null;
	roles: string[];
	roles_asignados: Rol[];
	cargo_nombre: string | null;
}

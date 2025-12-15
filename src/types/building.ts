export interface Branch {
	id: number;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	name: string;
	address: string;
	country: string;
	city: string;
	zipCode: string;
	phone: string;
	email: string;
	gps_location: string;
	isActive: boolean;
	description: string;
}

export interface StorageRoom {
	id: number;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	space: string;
	floor: string;
	width: string;
	length: string;
	height: string;
	depth: string;
	areaM2: string;
	volumeM3: string;
	price: string;
	image: string;
	status: string;
	description: string;
}

export interface Building {
	id: number;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	name: string;
	floors: number;
	isActive: boolean;
	description: string;
	branch: Branch;
	storageRooms: StorageRoom[];
}

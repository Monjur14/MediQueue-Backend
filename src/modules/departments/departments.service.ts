import { departmentsRepository } from './departments.repository.js';
import { tenantsRepository } from '../tenants/tenants.repository.js';
import type {
    CreateDepartmentInput,
    UpdateDepartmentInput,
} from './departments.schema.js';

export const departmentsService = {

    async create(tenantId: string, input: CreateDepartmentInput) {
        // check plan department limit
        const plan = await tenantsRepository.getPlanByTenantId(tenantId);
        if (plan && plan.max_departments !== null) {
            const count = await departmentsRepository.countDepartmentsInTenant(tenantId);
            if (count >= plan.max_departments) {
                throw new Error('DEPARTMENT_LIMIT_REACHED');
            }
        }

        const department = await departmentsRepository.create({
            tenant_id: tenantId,
            name: input.name,
            ...(input.description !== undefined && { description: input.description }),
        });

        return department;
    },

    async getAll(tenantId: string) {
        return departmentsRepository.findAll(tenantId);
    },

    async getById(id: string, tenantId: string) {
        const department = await departmentsRepository.findById(id, tenantId);
        if (!department) throw new Error('DEPARTMENT_NOT_FOUND');
        return department;
    },

    async update(id: string, tenantId: string, input: UpdateDepartmentInput) {
        if (Object.keys(input).length === 0) {
            throw new Error('NO_FIELDS_TO_UPDATE');
        }

        const department = await departmentsRepository.update(id, tenantId, input);
        if (!department) throw new Error('DEPARTMENT_NOT_FOUND');

        return department;
    },

    async remove(id: string, tenantId: string) {
        const department = await departmentsRepository.softDelete(id, tenantId);
        if (!department) throw new Error('DEPARTMENT_NOT_FOUND');
    },
    async assignDoctor(departmentId: string, doctorId: string, tenantId: string) {
        // check department belongs to tenant
        const department = await departmentsRepository.findById(departmentId, tenantId);
        if (!department) throw new Error('DEPARTMENT_NOT_FOUND');

        // check doctor belongs to tenant
        const doctor = await departmentsRepository.findDoctorInTenant(doctorId, tenantId);
        if (!doctor) throw new Error('DOCTOR_NOT_FOUND');

        // check not already assigned
        const existing = await departmentsRepository.isDoctorAssigned(departmentId, doctorId);
        if (existing) throw new Error('DOCTOR_ALREADY_ASSIGNED');

        return departmentsRepository.assignDoctor(departmentId, doctorId);
    },

    async removeDoctor(departmentId: string, doctorId: string, tenantId: string) {
        // check department belongs to tenant
        const department = await departmentsRepository.findById(departmentId, tenantId);
        if (!department) throw new Error('DEPARTMENT_NOT_FOUND');

        const result = await departmentsRepository.removeDoctor(departmentId, doctorId);
        if (!result) throw new Error('DOCTOR_NOT_ASSIGNED');
    },

    async getDoctorsInDepartment(departmentId: string, tenantId: string) {
        const department = await departmentsRepository.findById(departmentId, tenantId);
        if (!department) throw new Error('DEPARTMENT_NOT_FOUND');

        return departmentsRepository.getDoctorsInDepartment(departmentId);
    },

    async getOverview(tenantId: string) {
        const departments = await departmentsRepository.getOverview(tenantId);
        const unassignedDoctors = await departmentsRepository.getUnassignedDoctors(tenantId);

        return {
            departments,
            unassigned_doctors: unassignedDoctors,
        };
    },
    async getPublicDepartments(slug: string) {
        const tenant = await departmentsRepository.findTenantBySlug(slug);
        if (!tenant) throw new Error('CLINIC_NOT_FOUND');

        const departments = await departmentsRepository.getPublicDepartments(tenant.id);
        return { clinic: tenant, departments };
    },

    async getPublicDoctorsInDepartment(slug: string, departmentId: string) {
        const tenant = await departmentsRepository.findTenantBySlug(slug);
        if (!tenant) throw new Error('CLINIC_NOT_FOUND');

        const department = await departmentsRepository.findById(departmentId, tenant.id);
        if (!department) throw new Error('DEPARTMENT_NOT_FOUND');

        const doctors = await departmentsRepository.getPublicDoctorsInDepartment(departmentId);
        return { department, doctors };
    },
};
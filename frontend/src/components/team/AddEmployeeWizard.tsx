'use client';

import React, { useState, useEffect } from 'react';
import {
  EmployeeRecord,
  TeamRole,
  RolePermissionsMap,
  EmployeeAddress,
  EmployeePersonalDetails,
} from './types';
import {
  MODULE_CONFIGS,
  getPresetPermissions,
  handlePermissionToggle,
} from './permissionsConfig';
import { teamStore } from './teamStore';

interface AddEmployeeWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Omit<EmployeeRecord, 'id' | 'createdAt' | 'initials' | 'clientsCount' | 'tasksCount' | 'recurringCount'>) => void;
  isEdit?: boolean;
  initialData?: EmployeeRecord | null;
  mode?: 'standard' | 'acceptRequest';
}

export const AddEmployeeWizard: React.FC<AddEmployeeWizardProps> = ({
  isOpen,
  onClose,
  onSave,
  isEdit = false,
  initialData,
  mode = 'standard',
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Step 1: Employment Details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [designation, setDesignation] = useState('');
  const [role, setRole] = useState<TeamRole>('Employee');
  const [department, setDepartment] = useState('Audit & Taxation');
  const [shift, setShift] = useState('General (09:30 AM - 06:30 PM)');
  const [reportingTo, setReportingTo] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [salary, setSalary] = useState('');
  const [costPerHour, setCostPerHour] = useState('');
  const [billingRate, setBillingRate] = useState('');
  const [workExperience, setWorkExperience] = useState('');

  // Step 2: Personal Details
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [idProofType, setIdProofType] = useState('PAN');
  const [idNumber, setIdNumber] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('Single');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [education, setEducation] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactNumber, setEmergencyContactNumber] = useState('');

  // Step 3: Address
  const [sameAddress, setSameAddress] = useState(true);
  const [presentAddress, setPresentAddress] = useState<EmployeeAddress>({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
  });
  const [permanentAddress, setPermanentAddress] = useState<EmployeeAddress>({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
  });

  // Step 4: Role Permissions
  const [permissions, setPermissions] = useState<RolePermissionsMap>(
    getPresetPermissions('Employee')
  );

  // Sync / pre-fill form fields whenever initialData or isOpen changes
  useEffect(() => {
    if (initialData) {
      const parts = (initialData.name || '').trim().split(/\s+/);
      const derivedFirst = initialData.firstName || parts[0] || '';
      const derivedLast = initialData.lastName || parts.slice(1).join(' ') || '';

      setFirstName(derivedFirst);
      setLastName(derivedLast);
      setEmail(initialData.email || '');
      setMobile(initialData.mobile || '');
      setDesignation(initialData.designation || '');
      setRole(initialData.role || 'Employee');
      setDepartment(initialData.department || 'Audit & Taxation');
      setShift(initialData.shift || 'General (09:30 AM - 06:30 PM)');
      setReportingTo(initialData.reportingTo || '');
      setEmployeeId(initialData.employeeId || '');
      setJoiningDate(initialData.joiningDate || '');
      setSalary(initialData.salary !== undefined ? String(initialData.salary) : '');
      setCostPerHour(initialData.costPerHour !== undefined ? String(initialData.costPerHour) : '');
      setBillingRate(initialData.billingRate !== undefined ? String(initialData.billingRate) : '');
      setWorkExperience(initialData.workExperience || '');

      setDob(initialData.personalDetails?.dob || '');
      setGender(initialData.personalDetails?.gender || 'Male');
      setIdProofType(initialData.personalDetails?.idProofType || 'PAN');
      setIdNumber(initialData.personalDetails?.idNumber || '');
      setMaritalStatus(initialData.personalDetails?.maritalStatus || 'Single');
      setBloodGroup(initialData.personalDetails?.bloodGroup || 'O+');
      setEducation(initialData.personalDetails?.education || '');
      setFatherName(initialData.personalDetails?.fatherName || '');
      setMotherName(initialData.personalDetails?.motherName || '');
      setEmergencyContactName(initialData.personalDetails?.emergencyContactName || '');
      setEmergencyContactNumber(initialData.personalDetails?.emergencyContactNumber || '');

      setSameAddress(initialData.sameAddress ?? true);
      setPresentAddress(
        initialData.presentAddress || {
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          country: 'India',
          pincode: '',
        }
      );
      setPermanentAddress(
        initialData.permanentAddress || {
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          country: 'India',
          pincode: '',
        }
      );
      setPermissions(
        initialData.permissions || getPresetPermissions(initialData.role || 'Employee')
      );
      let currentPass = initialData.password || '';
      if (!currentPass && initialData.email) {
        const matching = teamStore.getEmployees().find(
          (e) => e.email.toLowerCase() === initialData.email.toLowerCase()
        );
        if (matching?.password) {
          currentPass = matching.password;
        }
      }
      setPassword(currentPass);
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setMobile('');
      setPassword('');
      setDesignation('');
      setRole('Employee');
      setDepartment('Audit & Taxation');
      setShift('General (09:30 AM - 06:30 PM)');
      setReportingTo('');
      setEmployeeId('');
      setJoiningDate('');
      setSalary('');
      setCostPerHour('');
      setBillingRate('');
      setWorkExperience('');
      setDob('');
      setGender('Male');
      setIdProofType('PAN');
      setIdNumber('');
      setMaritalStatus('Single');
      setBloodGroup('O+');
      setEducation('');
      setFatherName('');
      setMotherName('');
      setEmergencyContactName('');
      setEmergencyContactNumber('');
      setSameAddress(true);
      setPresentAddress({
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
      });
      setPermanentAddress({
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
      });
      setPermissions(getPresetPermissions('Employee'));
    }
    setCurrentStep(1);
    setErrorMsg('');
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleRoleChange = (newRole: TeamRole) => {
    setRole(newRole);
    setPermissions(getPresetPermissions(newRole));
  };

  const handlePermissionCheckbox = (
    moduleKey: string,
    field: 'view' | 'addEdit' | 'delete' | 'import' | 'export',
    checked: boolean
  ) => {
    if (role === 'Admin') return; // Admin is immutable full access
    const updated = handlePermissionToggle(permissions, moduleKey, field, checked);
    setPermissions(updated);
  };

  const validateStep1 = (): boolean => {
    setErrorMsg('');
    if (!firstName.trim()) {
      setErrorMsg('First name is required.');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('A valid email address is required.');
      return false;
    }
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return false;
    }
    if (!designation.trim()) {
      setErrorMsg('Designation is required.');
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    setErrorMsg('');
    if (!presentAddress.addressLine1.trim()) {
      setErrorMsg('Address Line 1 is required.');
      return false;
    }
    if (!presentAddress.city.trim() || !presentAddress.state.trim()) {
      setErrorMsg('City and State are required.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 3 && !validateStep3()) return;
    setErrorMsg('');
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setErrorMsg('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSave = () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const effectivePermanent = sameAddress ? { ...presentAddress } : permanentAddress;

    const personalDetails: EmployeePersonalDetails = {
      dob,
      gender,
      idProofType,
      idNumber,
      maritalStatus,
      bloodGroup,
      education,
      fatherName,
      motherName,
      emergencyContactName,
      emergencyContactNumber,
    };

    const payload: any = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: fullName,
      email: email.trim().toLowerCase(),
      mobile: mobile.replace(/\D/g, '').slice(-10),
      designation: designation.trim(),
      role,
      department,
      shift,
      reportingTo: reportingTo.trim() || undefined,
      employeeId: employeeId.trim() || undefined,
      joiningDate: joiningDate || undefined,
      salary: salary ? Number(salary) : undefined,
      costPerHour: costPerHour ? Number(costPerHour) : undefined,
      billingRate: billingRate ? Number(billingRate) : undefined,
      workExperience: workExperience.trim() || undefined,
      status: initialData?.status || 'Active',
      presentAddress,
      permanentAddress: effectivePermanent,
      sameAddress,
      personalDetails,
      permissions,
    };

    if (isEdit) {
      payload.password = password.trim();
    } else {
      payload.password = password.trim() || '123456';
    }

    onSave(payload);

    onClose();
  };

  const steps = [
    { num: 1, title: 'Employment Details', sub: 'Basic employee info' },
    { num: 2, title: 'Personal Details', sub: 'Demographics & ID' },
    { num: 3, title: 'Address', sub: 'Present & permanent' },
    { num: 4, title: 'Role Permissions', sub: 'Access control grid' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#334155] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#334155] flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-[#162032] dark:to-[#1e293b]">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {mode === 'acceptRequest' ? 'Accept Employment Request' : isEdit ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Step {currentStep} of 4: {steps[currentStep - 1].title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#162032] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="px-6 py-3 bg-gray-50/70 dark:bg-[#162032] border-b border-gray-100 dark:border-[#334155] flex items-center justify-between">
          {steps.map((st, idx) => {
            const isCompleted = currentStep > st.num;
            const isCurrent = currentStep === st.num;
            return (
              <div key={st.num} className="flex items-center gap-3 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                      ? 'bg-[#31719B] text-white shadow-md shadow-[#31719B]/20'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    st.num
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <div className={`text-xs font-semibold ${isCurrent ? 'text-[#31719B] dark:text-[#60a5fa]' : 'text-gray-700 dark:text-gray-300'}`}>
                    {st.title}
                  </div>
                  <div className="text-[10px] text-gray-400">{st.sub}</div>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 bg-gray-200 dark:bg-gray-700 hidden md:block" />
                )}
              </div>
            );
          })}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Employment Details */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Deepak"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Sahani"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  disabled={mode === 'acceptRequest'}
                  readOnly={mode === 'acceptRequest'}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deepak@krishnaassociates.example"
                  className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none transition-colors ${
                    mode === 'acceptRequest'
                      ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed select-none'
                      : 'border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              {mode !== 'acceptRequest' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Login Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full text-sm px-3 py-2 pr-10 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Audit Senior / Article Assistant"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as TeamRole)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                >
                  <option value="Admin">Admin</option>
                  <option value="Partner">Partner</option>
                  <option value="Manager">Manager</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                >
                  <option value="All Department">All Department</option>
                  <option value="Audit & Taxation">Audit & Taxation</option>
                  <option value="Audit">Audit</option>
                  <option value="Taxation">Taxation</option>
                  <option value="Accounts">Accounts</option>
                  <option value="Corporate Law">Corporate Law</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Shift <span className="text-red-500">*</span>
                </label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                >
                  <option value="General (09:30 AM - 06:30 PM)">General (09:30 AM - 06:30 PM)</option>
                  <option value="Morning (08:30 AM - 05:30 PM)">Morning (08:30 AM - 05:30 PM)</option>
                  <option value="Flexible (09:00 AM - 06:00 PM)">Flexible (09:00 AM - 06:00 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Reporting To
                </label>
                <input
                  type="text"
                  value={reportingTo}
                  onChange={(e) => setReportingTo(e.target.value)}
                  placeholder="e.g. Sunita Sharma"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. EMP007"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Date of Joining
                </label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Salary / Stipend (₹/mo)
                </label>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="e.g. 35000"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Cost Per Hour (₹)
                </label>
                <input
                  type="number"
                  value={costPerHour}
                  onChange={(e) => setCostPerHour(e.target.value)}
                  placeholder="e.g. 400"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Billing Rate (₹/hr)
                </label>
                <input
                  type="number"
                  value={billingRate}
                  onChange={(e) => setBillingRate(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Work Experience
                </label>
                <input
                  type="text"
                  value={workExperience}
                  onChange={(e) => setWorkExperience(e.target.value)}
                  placeholder="e.g. 3 Years in Statutory Audit"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Personal Details */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  ID Proof Type
                </label>
                <select
                  value={idProofType}
                  onChange={(e) => setIdProofType(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                >
                  <option value="PAN">PAN Card</option>
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  ID Number
                </label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Marital Status
                </label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                >
                  <option value="A+">A+</option>
                  <option value="B+">B+</option>
                  <option value="AB+">AB+</option>
                  <option value="O+">O+</option>
                  <option value="A-">A-</option>
                  <option value="B-">B-</option>
                  <option value="AB-">AB-</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Education / Qualifications
                </label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="e.g. CA Inter, B.Com (Hons), DISA"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Father's Name
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Father's full name"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Mother's Name
                </label>
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder="Mother's full name"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="e.g. Suresh Sahani (Brother)"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Emergency Contact Number
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={emergencyContactNumber}
                  onChange={(e) => setEmergencyContactNumber(e.target.value)}
                  placeholder="9812345678"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Address */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#3D6A9E]" />
                  Present Address
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Address Line 1 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={presentAddress.addressLine1}
                      onChange={(e) => setPresentAddress({ ...presentAddress, addressLine1: e.target.value })}
                      placeholder="Flat / Building / House No., Street"
                      className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={presentAddress.addressLine2 || ''}
                      onChange={(e) => setPresentAddress({ ...presentAddress, addressLine2: e.target.value })}
                      placeholder="Landmark / Area"
                      className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={presentAddress.city}
                      onChange={(e) => setPresentAddress({ ...presentAddress, city: e.target.value })}
                      placeholder="e.g. Mumbai"
                      className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={presentAddress.state}
                      onChange={(e) => setPresentAddress({ ...presentAddress, state: e.target.value })}
                      placeholder="e.g. Maharashtra"
                      className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={presentAddress.pincode}
                      onChange={(e) => setPresentAddress({ ...presentAddress, pincode: e.target.value })}
                      placeholder="400001"
                      className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                    />
                  </div>
                </div>
              </div>

              {/* Same address checkbox */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-[#334155]">
                <input
                  type="checkbox"
                  id="sameAddress"
                  checked={sameAddress}
                  onChange={(e) => setSameAddress(e.target.checked)}
                  className="w-4 h-4 text-[#3D6A9E] rounded border-gray-300 dark:border-[#475569] focus:ring-[#3D6A9E]"
                />
                <label htmlFor="sameAddress" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  Same as Present Address
                </label>
              </div>

              {/* Permanent Address */}
              {!sameAddress && (
                <div className="pt-2 animate-fadeIn">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Permanent Address
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Address Line 1
                      </label>
                      <input
                        type="text"
                        value={permanentAddress.addressLine1}
                        onChange={(e) => setPermanentAddress({ ...permanentAddress, addressLine1: e.target.value })}
                        placeholder="Flat / Building / House No., Street"
                        className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Address Line 2
                      </label>
                      <input
                        type="text"
                        value={permanentAddress.addressLine2 || ''}
                        onChange={(e) => setPermanentAddress({ ...permanentAddress, addressLine2: e.target.value })}
                        placeholder="Landmark / Area"
                        className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={permanentAddress.city}
                        onChange={(e) => setPermanentAddress({ ...permanentAddress, city: e.target.value })}
                        placeholder="City"
                        className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={permanentAddress.state}
                        onChange={(e) => setPermanentAddress({ ...permanentAddress, state: e.target.value })}
                        placeholder="State"
                        className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Pincode
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={permanentAddress.pincode}
                        onChange={(e) => setPermanentAddress({ ...permanentAddress, pincode: e.target.value })}
                        placeholder="Pincode"
                        className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6A9E]/20 focus:border-[#3D6A9E]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Role Permissions */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-[#334155]">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Permissions for {role} Role
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Control access to modules. Checking Add/Edit, Delete, Import, or Export auto-enables View.
                  </p>
                </div>

                {role !== 'Admin' && (
                  <button
                    type="button"
                    onClick={() => setPermissions(getPresetPermissions(role))}
                    className="text-xs font-semibold text-[#3D6A9E] dark:text-[#60a5fa] hover:text-[#3D6A9E] px-3 py-1.5 rounded-lg border border-[#3D6A9E]/30 dark:border-[#475569] hover:bg-[#EEF2FF] dark:hover:bg-[#162032] transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    Reset to {role} Defaults
                  </button>
                )}
              </div>

              {role === 'Admin' && (
                <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 rounded-xl flex items-center gap-3 text-purple-900 dark:text-purple-300">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-purple-950 dark:text-purple-200">Full Administrative Access</div>
                    <div className="text-purple-700 dark:text-purple-300">
                      Users with the Admin role have unrestricted view, edit, delete, import, and export permissions across all 33 firm modules.
                    </div>
                  </div>
                </div>
              )}

              {/* 33 Modules Permissions Matrix */}
              <div className="border border-gray-200 dark:border-[#334155] rounded-xl overflow-hidden shadow-2xs max-h-[460px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 dark:bg-[#162032] text-gray-600 dark:text-gray-400 uppercase font-semibold sticky top-0 z-10 border-b border-gray-200 dark:border-[#334155]">
                    <tr>
                      <th className="py-2.5 px-4">Module Name</th>
                      <th className="py-2.5 px-3 text-center w-24">View</th>
                      <th className="py-2.5 px-3 text-center w-24">Add / Edit</th>
                      <th className="py-2.5 px-3 text-center w-24">Delete</th>
                      <th className="py-2.5 px-3 text-center w-24">Import</th>
                      <th className="py-2.5 px-3 text-center w-24">Export</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#334155]/60">
                    {MODULE_CONFIGS.map((mod, idx) => {
                      const curPerm = permissions[mod.key] || {
                        view: false,
                        addEdit: false,
                        delete: false,
                        import: false,
                        export: false,
                      };
                      const isAdmin = role === 'Admin';

                      return (
                        <tr
                          key={mod.key}
                          className={idx % 2 === 0 ? 'bg-white dark:bg-[#1e293b] hover:bg-gray-50/50 dark:hover:bg-[#131d30]' : 'bg-gray-50/30 dark:bg-[#162032]/40 hover:bg-gray-50/60 dark:hover:bg-[#131d30]'}
                        >
                          <td className="py-2 px-4 font-medium text-gray-800 dark:text-gray-200">
                            {mod.label}
                          </td>

                          {/* View */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isAdmin ? true : curPerm.view}
                              disabled={isAdmin || !mod.canView}
                              onChange={(e) => handlePermissionCheckbox(mod.key, 'view', e.target.checked)}
                              className="w-4 h-4 text-[#3D6A9E] rounded border-gray-300 dark:border-gray-600 accent-[#3D6A9E] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Add / Edit */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isAdmin ? true : curPerm.addEdit}
                              disabled={isAdmin || !mod.canAddEdit}
                              onChange={(e) => handlePermissionCheckbox(mod.key, 'addEdit', e.target.checked)}
                              className="w-4 h-4 text-[#3D6A9E] rounded border-gray-300 dark:border-gray-600 accent-[#3D6A9E] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Delete */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isAdmin ? true : curPerm.delete}
                              disabled={isAdmin || !mod.canDelete}
                              onChange={(e) => handlePermissionCheckbox(mod.key, 'delete', e.target.checked)}
                              className="w-4 h-4 text-[#3D6A9E] rounded border-gray-300 dark:border-gray-600 accent-[#3D6A9E] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Import */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isAdmin ? mod.canImport : curPerm.import}
                              disabled={isAdmin || !mod.canImport}
                              onChange={(e) => handlePermissionCheckbox(mod.key, 'import', e.target.checked)}
                              className="w-4 h-4 text-[#3D6A9E] rounded border-gray-300 dark:border-gray-600 accent-[#3D6A9E] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Export */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isAdmin ? mod.canExport : curPerm.export}
                              disabled={isAdmin || !mod.canExport}
                              onChange={(e) => handlePermissionCheckbox(mod.key, 'export', e.target.checked)}
                              className="w-4 h-4 text-[#3D6A9E] rounded border-gray-300 dark:border-gray-600 accent-[#3D6A9E] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-[#334155] bg-gray-50/50 dark:bg-[#162032] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0f172a] border border-gray-300 dark:border-[#475569] rounded-lg hover:bg-gray-100 dark:hover:bg-[#1e293b] transition-colors shadow-2xs cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0f172a] border border-gray-300 dark:border-[#475569] rounded-lg hover:bg-gray-100 dark:hover:bg-[#1e293b] transition-colors shadow-2xs cursor-pointer"
              >
                Back
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#31719B] rounded-lg hover:bg-[#27597b] transition-colors shadow-sm shadow-[#31719B]/20 cursor-pointer"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors shadow-sm shadow-emerald-600/20 cursor-pointer"
              >
                {isEdit ? 'Save Changes' : 'Save Employee'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

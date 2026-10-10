export interface SampleDoc {
  id: string;
  title: string;
  description: string;
  text: string;
}

export const sampleDocuments: SampleDoc[] = [
  {
    id: 'acme-tos',
    title: 'Acme Cloud Terms of Service',
    description: 'Cloud platform terms with content ownership, account suspension, and age requirements.',
    text: `Effective date: January 1, 2025

1. Acceptance of Terms
By creating an account or using any Acme Cloud service, you agree to be bound by these Terms of Service. If you do not agree, you may not use the services.

2. Definitions
"You" means the individual or entity registering an account. "Acme," "we," and "us" means Acme Cloud, Inc. "Content" means any data, text, files, code, images, or other materials you upload or create using the services.

3. Eligibility
You must be at least 13 years of age to create an account and use the services. By registering, you represent that you meet this age requirement.

4. Your Account
You are responsible for maintaining the security of your account credentials. You must not share your password with anyone. You are responsible for all activity that occurs under your account.

5. Your Content
You own all Content that you upload, create, or store using the services. Acme does not claim ownership of your Content. You retain all intellectual property rights in your Content. You grant Acme a worldwide, non-exclusive, royalty-free license to host, store, process, and transmit your Content as necessary to provide the services to you. You are solely responsible for the Content you upload and for ensuring it does not violate any law or third-party rights.

6. License Grant to Us
You grant Acme the right to use your Content solely for the purpose of operating, maintaining, and improving the services. We will not use your Content for training machine learning models without your explicit opt-in consent. You may revoke this license at any time by deleting your Content from the services.

7. Acceptable Use
You agree not to use the services to upload Content that is unlawful, harmful, defamatory, infringing, harassing, or otherwise objectionable. You agree not to attempt to disrupt or compromise the security of the services. You agree not to reverse engineer, decompile, or disassemble any part of the services.

8. Account Suspension and Termination
Acme may suspend or terminate your account at any time without prior notice if we believe you have violated these Terms or any applicable law. Acme may also suspend or terminate accounts that are inactive for more than 12 consecutive months. Upon termination, your Content may be deleted after a 30-day grace period. You may terminate your account at any time by contacting support or through your account settings.

9. Privacy
Your use of the services is also governed by our Privacy Policy, which is incorporated herein by reference. We collect and process personal data as described in the Privacy Policy.

10. Service Availability
Acme does not guarantee that the services will be available at all times or uninterrupted. We may modify, suspend, or discontinue any feature of the services at any time without notice. We are not liable for any downtime, data loss, or service interruption.

11. Fees and Billing
Some services require payment of subscription fees. Fees are billed in advance on a recurring basis. All fees are non-refundable except where required by law. We may change our fees at any time with 30 days notice.

12. Intellectual Property
The services, including all software, designs, interfaces, and documentation, are owned by Acme and protected by intellectual property laws. You may not copy, modify, or distribute any part of the services without our prior written consent.

13. Disclaimers
The services are provided "as is" and "as available" without warranties of any kind. Acme disclaims all implied warranties including merchantability and fitness for a particular purpose. Acme does not warrant that the services will be error-free or secure.

14. Limitation of Liability
To the maximum extent permitted by law, Acme shall not be liable for any indirect, incidental, special, consequential, or punitive damages. Acme's total liability for any claim shall not exceed the amount you paid in the 12 months preceding the claim.

15. Indemnification
You agree to indemnify and hold Acme harmless from any claims, damages, or expenses arising from your use of the services or your violation of these Terms.

16. Changes to These Terms
We may update these Terms at any time. We will notify you of material changes by email or in-app notification. Your continued use of the services after changes take effect constitutes acceptance of the updated Terms.

17. Governing Law
These Terms are governed by the laws of the State of California, without regard to its conflict of laws principles. Any dispute arising from these Terms shall be resolved in the state or federal courts located in San Francisco County, California.

18. General Provisions
These Terms constitute the entire agreement between you and Acme regarding the services. If any provision is found unenforceable, the remaining provisions remain in effect. Our failure to enforce any right is not a waiver of that right.

19. Contact
If you have questions about these Terms, please contact us at legal@acmecloud.example.com.`,
  },
  {
    id: 'northwind-handbook',
    title: 'Northwind Employee Handbook',
    description: 'Employee handbook covering PTO, remote work, expenses, and conduct.',
    text: `Northwind Employee Handbook
Effective: March 1, 2025

A. Welcome
Welcome to Northwind. This handbook outlines our policies and expectations for all employees. Please read it carefully.

B. Employment at Will
Employment at Northwind is at-will. Either you or Northwind may terminate the employment relationship at any time, with or without cause or notice.

C. Work Hours and Schedule
Standard work hours are 9:00 AM to 5:00 PM, Monday through Friday. Employees are expected to be available during core hours of 10:00 AM to 3:00 PM. Flexible scheduling is available with manager approval.

D. Remote Work Policy
Employees may work remotely up to 3 days per week with manager approval. Remote employees must maintain a reliable internet connection and be reachable during work hours. Employees who work remotely must attend in-person team meetings at least once per month. Fully remote arrangements require director-level approval and are reviewed quarterly.

E. Paid Time Off
Full-time employees accrue 15 days of paid time off per year during their first 3 years. After 3 years, accrual increases to 20 days per year. PTO must be requested at least 2 weeks in advance and approved by a manager. Unused PTO of up to 5 days may be carried over to the following year. PTO is paid out upon termination for accrued but unused days.

F. Sick Leave
Employees receive 10 days of paid sick leave per year. Sick leave does not carry over and is not paid out upon termination. A doctor's note is required for absences of 3 or more consecutive days.

G. Holidays
Northwind observes 11 paid holidays per year: New Year's Day, MLK Day, Presidents' Day, Memorial Day, Juneteenth, Independence Day, Labor Day, Thanksgiving, Day after Thanksgiving, Christmas Eve, and Christmas Day.

H. Expenses and Reimbursement
Employees may be reimbursed for pre-approved business expenses including travel, meals, and supplies. Expense reports must be submitted within 30 days of incurring the expense. Meal reimbursements are capped at 75 dollars per day for domestic travel and 100 dollars per day for international travel. Receipts are required for all expenses over 25 dollars.

I. Code of Conduct
Employees are expected to act professionally and treat colleagues with respect. Harassment, discrimination, or retaliation of any kind is prohibited and will result in disciplinary action up to and including termination. Employees must comply with all applicable laws and regulations.

J. Confidentiality
Employees must protect confidential company information including trade secrets, customer data, and strategic plans. Confidentiality obligations survive termination of employment.

K. Performance Reviews
Performance reviews are conducted annually in the first quarter. Reviews cover goal achievement, competencies, and development areas. Salary adjustments based on reviews take effect in April.

L. Dress Code
Business casual attire is expected in the office. Remote employees should dress appropriately for video calls with clients.

M. Travel Policy
Business travel must be approved in advance by a manager. Employees should book the most economical reasonable option. Air travel for flights over 4 hours may be booked in business class with director approval.

N. Training and Development
Northwind provides an annual training budget of 2,000 dollars per employee for professional development courses, conferences, and certifications. Training requests must be approved by a manager.

O. Equipment
Employees are provided with a laptop and necessary peripherals. Equipment must be returned upon termination. Remote employees may receive a one-time stipend of 500 dollars for home office setup.

P. Safety
Northwind is committed to providing a safe work environment. Employees should report safety concerns to their manager or HR immediately.

Q. Acknowledgment
By signing below, you acknowledge that you have read and understand this handbook.`,
  },
  {
    id: 'maple-lease',
    title: 'Maple Street Residential Lease',
    description: '600-line residential lease that triggers two-pass search.',
    text: `MAPLE STREET RESIDENTIAL LEASE AGREEMENT

1. Parties
This Residential Lease Agreement is entered into on this date between Maple Street Properties, LLC ("Landlord") and the tenant named in Section 2 ("Tenant").
Landlord's address is 142 Maple Street, Springfield, ST 00000.
Tenant's address is the Premises described in Section 3.
This lease is a legally binding contract. Both parties are advised to read it carefully before signing.

2. Tenant Information
The Tenant is the individual or individuals signing this lease.
All tenants are jointly and severally liable for all obligations under this lease.
Each tenant must be at least 18 years of age.
Tenant must provide Landlord with a current government-issued photo identification before signing.

3. Premises
Landlord leases to Tenant the residential property located at 142 Maple Street, Unit B, Springfield, ST 00000 ("the Premises").
The Premises is a one-bedroom apartment with approximately 750 square feet of living space.
The Premises includes a kitchen, bathroom, living room, bedroom, and one private balcony.
The Premises is part of a multi-unit residential building owned and managed by Landlord.

4. Term
The lease term begins on the first day of the month and continues for 12 months.
The lease automatically converts to a month-to-month tenancy at the end of the term unless either party provides 60 days written notice to terminate or renew.
If Tenant renews for a subsequent 12-month term, the rent shall be adjusted as described in the renewal notice.
Month-to-month tenancy may be terminated by either party with 60 days written notice.

5. Rent
Tenant shall pay rent in the amount of 1,850 dollars per month, due on the first day of each month.
Rent is considered late if not received by the 5th day of the month.
A late fee of 50 dollars applies to payments received after the 5th.
If rent is more than 10 days late, an additional fee of 25 dollars applies.
Rent payments must be made by electronic transfer, check, or money order. Cash is not accepted.
A returned check fee of 35 dollars applies to any payment that is dishonored by the bank.

6. Security Deposit
Tenant shall pay a security deposit of 1,850 dollars upon signing this lease.
The security deposit shall be held by Landlord for the duration of the tenancy.
The deposit will be returned within 30 days of lease termination, less any deductions for damages beyond normal wear and tear.
Landlord must provide an itemized list of any deductions.
The security deposit may not be used as the last month's rent.
Tenant waives the right to interest on the security deposit as permitted by applicable law.

7. Utilities
Tenant is responsible for paying electricity, gas, internet, and cable.
Landlord pays for water, sewer, and trash collection.
Tenant must keep all utilities in their name and active during the entire lease term.
Failure to maintain utilities may result in damage to the Premises for which Tenant is responsible.
Tenant is responsible for arranging and paying for all utility connection fees.

8. Occupancy
The Premises are to be used solely as a private residence.
Only the individuals named in this lease and their minor children may occupy the Premises.
No more than 3 persons may reside in the Premises.
Subletting is prohibited without prior written consent of the Landlord.
The Premises may not be used for any business, commercial, or professional purpose.
Overnight guests may stay for up to 14 consecutive days as described in Section 23.

9. Pets
No pets are allowed on the Premises without prior written consent from the Landlord.
If a pet is approved, Tenant must pay a pet deposit of 300 dollars and a monthly pet fee of 35 dollars.
Service animals as defined by the Americans with Disabilities Act are not considered pets and are permitted with documentation.
Emotional support animals require a letter from a licensed medical professional.
Tenant is responsible for all damage caused by pets, including damage to flooring, walls, and doors.
Pet deposits are non-refundable.

10. Quiet Enjoyment
Tenant is entitled to quiet enjoyment of the Premises.
Tenant shall not create noise that disturbs other residents, especially between the hours of 10:00 PM and 7:00 AM.
Tenant shall not operate musical instruments, televisions, or stereos at excessive volumes.
Repeated noise complaints may result in lease termination.

11. Maintenance and Repairs
Tenant shall keep the Premises in clean and sanitary condition.
Tenant is responsible for minor repairs costing less than 50 dollars including replacing light bulbs, smoke detector batteries, and air filters.
Tenant must report all maintenance issues to Landlord within 48 hours of discovery.
Landlord is responsible for all major repairs including plumbing, electrical, heating, and structural issues.
Landlord will respond to repair requests within 72 hours for non-emergency and 24 hours for emergency requests.
Emergency repairs include gas leaks, water leaks, electrical hazards, and heating failures during winter months.
Tenant must provide Landlord reasonable access to the Premises to perform repairs.

12. Tenant Damage
Tenant is responsible for the cost of repairing any damage to the Premises caused by Tenant or their guests, beyond normal wear and tear.
This includes damage to walls, floors, appliances, fixtures, and doors.
Normal wear and tear includes minor scuffs, fading paint, and wear on carpet consistent with normal use.
Damage caused by moving furniture, hanging pictures improperly, or neglecting maintenance is Tenant's responsibility.
Repair costs may be deducted from the security deposit.

13. Landlord Access
Landlord may enter the Premises for inspections, repairs, showings, or emergencies.
Landlord must provide 24 hours notice before entering for non-emergency purposes.
No notice is required for emergency entry.
Landlord may enter between 8:00 AM and 6:00 PM on weekdays for non-emergency purposes.
Landlord may show the Premises to prospective tenants or buyers during the final 60 days of the lease with 24 hours notice.
Tenant shall not change locks without Landlord's permission.

14. Alterations
Tenant may not paint, alter, or modify the Premises without prior written consent from the Landlord.
Any approved alterations become the property of the Landlord upon lease termination.
Tenant must restore the Premises to its original condition at move-out if required by Landlord.
Installation of additional electrical outlets, lighting fixtures, or plumbing fixtures requires Landlord approval.
Picture hooks and small nails for wall art are permitted without approval.

15. Smoking
Smoking of any substance is prohibited inside the Premises and within 25 feet of any building entrance.
Violation of this policy will result in a 250 dollar fine per occurrence.
Repeated violations may result in lease termination.
Smoking on the balcony is permitted only if it does not disturb other residents.
Tobacco, vaping, e-cigarettes, and cannabis are all included in this prohibition.

16. Parking
Tenant is assigned one parking space in the surface lot, space number 12.
Guest parking is available in designated areas for up to 48 hours.
Vehicles must be registered with the Landlord.
Inoperable vehicles will be towed at the Tenant's expense after 7 days.
Parking spaces may not be used for storage.
Commercial vehicles, trailers, and boats are not permitted in the parking lot.
A replacement parking permit costs 25 dollars.

17. Storage
Tenant is assigned one storage unit in the basement, unit B-12.
Storage of flammable, hazardous, or perishable materials is prohibited.
Landlord is not responsible for loss or damage to stored items.
Tenant must provide their own lock for the storage unit.
Storage units must be vacated upon lease termination.

18. Laundry
A shared laundry room is located in the basement.
Laundry room hours are 7:00 AM to 10:00 PM.
Tenant is responsible for cleaning the lint trap after each use.
Washing machines cost 1.50 dollars per load and dryers cost 1.25 dollars per load.
Tenant must remove clothing from machines promptly after use.

19. Trash and Recycling
Trash and recycling bins are located in the rear of the building.
Tenant must sort recyclables according to the posted guidelines.
Trash must be placed in sealed bags.
Bulk items require a scheduled pickup with 48 hours notice.
Hazardous materials including batteries and electronics must be disposed of at designated facilities.
Tenant must break down cardboard boxes before placing them in recycling.

20. Mail
Tenant's mail will be delivered to the mailbox assigned to the Premises, mailbox number B-12.
Tenant must notify the post office of their address change.
Tenant is responsible for forwarding mail after move-out.
Packages too large for the mailbox will be held at the front office for up to 5 days.

21. Renter's Insurance
Tenant is required to maintain renter's insurance with liability coverage of at least 100,000 dollars for the duration of the lease.
A copy of the insurance policy must be provided to Landlord before move-in.
Landlord's insurance does not cover Tenant's personal property.
Tenant must name Landlord as an additional interested party on the policy.
Lapse in coverage constitutes a violation of this lease.

22. Fire Safety
Tenant must not store flammable materials in the Premises.
Tenant must maintain working smoke detectors and must not disable them.
Candles and open flames are prohibited.
Grills of any type are prohibited on balconies and within 10 feet of the building.
Tenant must keep fire exits and hallways clear of personal property.
Fire drills may be conducted quarterly with 24 hours notice.

23. Guest Policy
Guests may stay in the Premises for up to 14 consecutive days or 30 total days per year.
Guests staying longer than 14 consecutive days must be approved by the Landlord in writing.
Tenant is responsible for the conduct of their guests.
Guests must comply with all building rules and lease terms.
Tenant must be present when guests are in the Premises.

24. Assignment and Subletting
Tenant may not assign this lease or sublet the Premises without prior written consent from the Landlord.
Landlord may withhold consent for any reason.
Any approved subtenant must meet the same eligibility criteria as the original Tenant.
A subletting fee of 200 dollars applies to cover administrative and screening costs.
Subletting does not release the original Tenant from lease obligations.

25. Default
Tenant is in default if rent is unpaid for more than 10 days after the due date, if Tenant violates any term of this lease, or if Tenant abandons the Premises.
Upon default, Landlord may terminate the lease, re-enter the Premises, and seek all remedies available under law.
Landlord must provide written notice of default before terminating the lease.
Tenant has 10 days from receipt of notice to cure the default.

26. Remedies
Upon default, Landlord may re-take possession of the Premises, terminate this lease, and recover all damages including unpaid rent, repair costs, and legal fees.
Landlord must mitigate damages by making reasonable efforts to re-rent the Premises.
If the Premises is re-rented for less than the original rent, Tenant is liable for the difference for the remainder of the lease term.
Tenant is responsible for advertising costs incurred to re-rent the Premises.

27. Early Termination by Tenant
Tenant may terminate this lease early by providing 60 days written notice and paying a termination fee equal to 2 months rent.
Tenant remains responsible for rent until the Premises is re-rented or the lease term ends, whichever comes first.
Early termination does not require a fee if Tenant receives a military deployment order, accepts a job transfer more than 50 miles away, or has a documented medical condition requiring relocation.
Documentation supporting the fee waiver must be provided with the termination notice.

28. Early Termination by Landlord
Landlord may terminate this lease early if the Premises is sold, if the Premises becomes uninhabitable, or if Landlord or an immediate family member intends to occupy the Premises.
Landlord must provide 60 days written notice and waive the final month's rent.
If the Premises becomes uninhabitable due to fire, flood, or other casualty, Landlord may terminate immediately and refund prorated rent.
Landlord is not liable for relocation costs in the event of early termination.

29. Abandonment
If Tenant vacates the Premises for more than 15 consecutive days without paying rent or notifying Landlord, the Premises is considered abandoned.
Landlord may re-enter and re-rent the Premises.
Tenant remains liable for rent until re-rented.
Personal property left in the Premises after abandonment will be disposed of after 30 days.

30. Habitability
Landlord warrants that the Premises is habitable and complies with all building and housing codes.
Landlord will maintain the Premises in a weather-tight and rodent-free condition.
If the Premises becomes uninhabitable due to conditions not caused by Tenant, rent shall be reduced proportionally for the period of uninhabitability.
Tenant must notify Landlord immediately of any conditions affecting habitability.

31. Lead-Based Paint Disclosure
The Premises was built before 1978.
Landlord discloses any known presence of lead-based paint.
Tenant has received the EPA pamphlet "Protect Your Family from Lead in Your Home."
Tenant must report any chipping, peeling, or deteriorating paint to Landlord immediately.

32. Mold Disclosure
Tenant is responsible for maintaining proper ventilation to prevent mold growth.
Tenant must promptly report any water leaks or mold growth to Landlord.
Tenant must use exhaust fans in the bathroom and kitchen.
Tenant must not block air vents or HVAC returns.

33. Bed Bug Addendum
Tenant must inspect their belongings for bed bugs before move-in.
Tenant must report any signs of bed bugs within 24 hours.
Treatment costs are the responsibility of the party whose activity introduced the infestation.
Tenant must cooperate fully with pest control treatment including preparing the Premises as directed.

34. Firearm Policy
Firearms must be stored in a locked container or with a trigger lock when not being carried on the person.
Discharge of firearms on the property is prohibited.
Hunting weapons must be unloaded and cased when transported through common areas.
Violation of this policy may result in lease termination.

35. Balcony and Common Areas
Balconies must be kept clean and may not be used for storage.
Grills, satellite dishes, and hanging laundry on balconies are prohibited.
Common areas must be respected and kept clean by all residents.
No personal property may be left in hallways, stairwells, or common areas.
Landlord is not liable for personal property left in common areas.

36. Noise and Nuisance
Tenant shall not engage in any activity that constitutes a nuisance to other residents.
This includes excessive noise, offensive odors, and blocking common areas.
Construction or DIY projects are limited to weekdays between 9:00 AM and 7:00 PM.
Musical instruments may be played between 10:00 AM and 9:00 PM at reasonable volume.

37. Window Treatments
Only white or off-white window treatments visible from the exterior are permitted.
No aluminum foil, sheets, or flags may be used as window coverings.
Blinds and curtains must be maintained in good condition.
Tenant is responsible for replacing damaged window treatments.

38. Move-In Inspection
Tenant must complete a move-in inspection checklist within 7 days of receiving the keys.
The checklist documents the condition of the Premises at move-in.
A copy must be returned to the Landlord.
Photos or video documenting the condition are recommended.
The move-in checklist is used to compare against the move-out inspection.

39. Move-Out Inspection
Tenant must schedule a move-out inspection with the Landlord.
The Premises must be cleaned and all personal property removed.
Keys must be returned at the inspection.
Failure to return keys will result in a re-keying charge of 75 dollars.
The Premises must be left in the same condition as move-in, minus normal wear and tear.
Carpet must be professionally cleaned at Tenant's expense.

40. Holdover
If Tenant remains in the Premises after the lease term without Landlord's consent, Tenant shall pay 150 percent of the monthly rent for each holdover month.
Holdover tenancy is month-to-month and terminable on 30 days notice.
Landlord may file for eviction if Tenant does not vacate after notice.

41. Severability
If any provision of this lease is found to be unenforceable, the remaining provisions remain in full force and effect.
The unenforceable provision shall be replaced with a enforceable provision that most closely reflects the original intent.

42. Waiver
Landlord's failure to enforce any provision of this lease at any time does not constitute a waiver of that provision or any other provision.
No waiver is effective unless in writing and signed by the waiving party.

43. Entire Agreement
This lease constitutes the entire agreement between Landlord and Tenant.
No prior representations or agreements are binding unless stated in this document.
No modification is valid unless in writing and signed by both parties.
Oral agreements are not binding.

44. Governing Law
This lease is governed by the laws of the State in which the Premises is located.
Any legal action arising from this lease shall be filed in the local county court.
Tenant consents to the jurisdiction of the local county court.

45. Notices
All notices must be in writing and delivered by certified mail, hand delivery, or email with read receipt.
Notices to Landlord should be sent to the address in Section 1.
Notices to Tenant should be sent to the Premises.
Notices are considered received 3 days after mailing.

46. Joint and Several Liability
If there are multiple Tenants, each is jointly and severally liable for all obligations under this lease.
Landlord may pursue any or all Tenants for the full amount owed.
A judgment against one Tenant does not release other Tenants from liability.

47. Indemnification
Tenant agrees to indemnify and hold Landlord harmless from any claims arising from Tenant's use of the Premises, except for claims arising from Landlord's negligence.
This indemnification survives lease termination.
Tenant is responsible for claims arising from Tenant's guests and pets.

48. Compliance with Laws
Tenant must comply with all federal, state, and local laws and ordinances related to the use and occupancy of the Premises.
Violations of law that result in enforcement action against Landlord are grounds for lease termination.
Tenant is responsible for any fines imposed due to Tenant's violation of laws.

49. Successors and Assigns
This lease is binding upon and inures to the benefit of the heirs, successors, and permitted assigns of the parties.
Assignment by Tenant is prohibited without Landlord's consent as described in Section 24.

50. Counterparts and Electronic Signatures
This lease may be executed in counterparts and by electronic signature.
Each counterpart is deemed an original.
Electronic signatures are legally binding and have the same effect as handwritten signatures.

51. Pet Rules and Restrictions
Approved pets must be under 50 pounds.
Aggressive breeds as defined by the Landlord's insurance policy are not permitted.
Pets must be leashed in all common areas.
Tenant must clean up after pets immediately.
No more than 2 pets per unit.
Pet noise that disturbs other residents is grounds for revoking pet approval.

52. HVAC and Appliances
The Premises includes a heating system, air conditioning unit, refrigerator, stove, and dishwasher.
Tenant must replace air filters monthly.
Landlord is responsible for repairing or replacing appliances that fail due to normal use.
Tenant is responsible for repairs due to misuse.
The thermostat must not be set below 55 degrees in winter to prevent pipe freezing.

53. Waterbeds
Waterbeds are not permitted on any floor of the Premises.

54. Satellite Dishes and Antennas
Satellite dishes and antennas may be installed only with prior written consent.
Dishes must be placed on a tripod on the balcony, not attached to the building exterior.
Installation must not damage the building structure.
Tenant is responsible for removal at move-out.

55. Bike Storage
Bicycle storage is available in the bike room located in the basement.
Bikes must be registered with the Landlord.
Bikes may not be stored in hallways or on balconies.
A bike lock is required.
Landlord is not responsible for stolen or damaged bicycles.

56. Package Delivery
Packages are delivered to the front door of the Premises.
Landlord is not responsible for stolen packages.
A package locker system is available for a monthly fee of 10 dollars.
Oversized packages must be picked up from the front office within 5 days.

57. Pest Control
Landlord provides quarterly pest control treatments.
Tenant must prepare the Premises as directed before each treatment.
Tenant must report any pest sightings between treatments.
Tenant-caused infestations are the financial responsibility of Tenant.

58. Emergency Procedures
In case of fire, evacuate immediately and call 911.
Do not use elevators during a fire.
The nearest fire exit is located at the east end of the hallway.
Fire extinguishers are located in the hallway and laundry room.
The building emergency assembly point is the parking lot across the street.
Tenant must keep emergency contact information current with the Landlord.

59. Snow Removal
Landlord is responsible for snow removal from driveways, parking lots, and walkways.
Tenant is responsible for snow removal from their assigned balcony and entrance steps.
Snow must be removed within 24 hours after snowfall ends.
Tenant must keep fire exits clear of snow and ice.

60. Landlord Contact Information
For maintenance requests, call the property management office at 555-0100.
For emergencies after hours, call 555-0199.
Email: maintenance@maplestreet.example.com.
Routine maintenance requests may also be submitted through the tenant portal.

61. Move-In Costs Summary
First month rent: 1,850 dollars.
Security deposit: 1,850 dollars.
Total due at signing: 3,700 dollars.
Pet deposit if applicable: 300 dollars.
Last month rent is not required in advance.

62. Pet Fees Summary
Pet deposit: 300 dollars.
Monthly pet fee: 35 dollars per pet.
Maximum 2 pets.
Pet fees are non-refundable.

63. Parking Rules
Only registered vehicles may park in assigned spaces.
Visitor parking is limited to 48 hours.
Oversized vehicles including RVs and commercial trucks are prohibited.
Parking permits must be displayed on the dashboard.
Violations may result in towing at the vehicle owner's expense.

64. Guest Registration
Guests staying more than 7 days must be registered with the Landlord.
Registration includes name, relationship, and duration of stay.
Guests staying less than 7 days do not require registration.
Tenant is responsible for ensuring guests comply with all building rules.

65. Holiday Decorations
Holiday decorations may be displayed on the interior of the Premises and on the balcony for up to 30 days.
No decorations may be attached to the building exterior with nails or screws.
Lights must be UL-listed and turned off between 10:00 PM and 6:00 AM.
Decorations must be removed within 7 days after the holiday.

66. Roommate Changes
If a Tenant wishes to add or replace a roommate, the new roommate must complete an application and be approved by the Landlord.
A roommate change fee of 100 dollars applies.
A new lease or lease amendment must be signed by all parties.
The departing roommate remains liable for rent until the amendment is signed.

67. Subordination
This lease is subordinate to any mortgage on the Premises.
Tenant agrees to attorn to any successor owner.
This means Tenant will recognize a new owner as Landlord if the property is foreclosed upon.

68. Right of First Refusal
If the Premises is offered for sale, Tenant has the right of first refusal at the listed price for 10 days after receiving written notice.
Tenant must respond in writing within the 10-day period.
If Tenant declines or does not respond, the property may be sold to any buyer.

69. Attorney Fees
If either party brings a legal action to enforce this lease, the prevailing party is entitled to reasonable attorney fees and court costs.
This provision does not apply to small claims court actions where attorney fees are not permitted by law.

70. Signatures
By signing below, Landlord and Tenant agree to all terms and conditions of this lease.
Tenant acknowledges receipt of a copy of this lease.
Tenant has had the opportunity to review this lease with legal counsel if desired.
This lease is effective as of the date signed by both parties.`,
  },
];

export interface PresetQuery {
  docId: string;
  query: string;
  hint: 'answered' | 'partial' | 'not_in_document';
  hintLabel: string;
}

export const presetQueries: PresetQuery[] = [
  {
    docId: 'acme-tos',
    query: 'Who owns the code I upload?',
    hint: 'answered',
    hintLabel: 'Answered',
  },
  {
    docId: 'acme-tos',
    query: 'Can they kick me off without warning?',
    hint: 'answered',
    hintLabel: 'Answered',
  },
  {
    docId: 'acme-tos',
    query: 'Do I have to go to arbitration?',
    hint: 'not_in_document',
    hintLabel: 'Not in doc',
  },
  {
    docId: 'acme-tos',
    query: 'Can minors use it with parental permission?',
    hint: 'partial',
    hintLabel: 'Partial',
  },
  {
    docId: 'northwind-handbook',
    query: 'How many vacation days do I get?',
    hint: 'answered',
    hintLabel: 'Answered',
  },
  {
    docId: 'northwind-handbook',
    query: 'Can I work from another country for a month?',
    hint: 'not_in_document',
    hintLabel: 'Not in doc',
  },
  {
    docId: 'maple-lease',
    query: 'What is the late fee for rent?',
    hint: 'answered',
    hintLabel: 'Answered',
  },
  {
    docId: 'maple-lease',
    query: 'Can I install a home security system?',
    hint: 'not_in_document',
    hintLabel: 'Not in doc',
  },
];

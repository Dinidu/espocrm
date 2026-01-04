<?php

namespace Espo\Custom\Tools\Report;

use Espo\Core\Tools\Report\Type;
use Espo\ORM\EntityManager;
use Espo\Core\Utils\Metadata;
use Espo\Core\Acl;
use Espo\Core\Select\SelectBuilderFactory;
use Espo\Modules\Crm\Entities\Lead;
use stdClass;

class NewVsExistingClientLead implements Type
{
    public function __construct(
        private EntityManager $entityManager,
        private Metadata $metadata,
        private Acl $acl,
        private SelectBuilderFactory $selectBuilderFactory
    ) {}

    public function run(stdClass $data, stdClass $params): stdClass
    {
        if (!$this->acl->checkScope(Lead::ENTITY_TYPE)) {
            throw new \Espo\Core\Exceptions\Forbidden("No access to Lead scope.");
        }

        // Build query to get all leads
        $queryBuilder = $this->selectBuilderFactory
            ->create()
            ->from(Lead::ENTITY_TYPE)
            ->withStrictAccessControl()
            ->buildQueryBuilder();

        // Apply date filters if provided
        if (isset($params->dateFrom) || isset($params->dateTo)) {
            $whereClause = [];
            
            if (isset($params->dateFrom)) {
                $whereClause[] = ['createdAt>=' => $params->dateFrom];
            }
            
            if (isset($params->dateTo)) {
                $whereClause[] = ['createdAt<=' => $params->dateTo];
            }
            
            $queryBuilder->where($whereClause);
        }

        $leads = $this->entityManager
            ->getRDBRepository(Lead::ENTITY_TYPE)
            ->clone($queryBuilder->build())
            ->find();

        // Group data by Customer Segment and Product Type
        $groupedData = [];
        
        foreach ($leads as $lead) {
            // Determine customer segment (simplify to New/Existing)
            $customerSegment = $lead->get('cCustomerSegment') ?? 'New Customer';
            $segmentKey = $this->normalizeSegment($customerSegment);
            
            // Get product type
            $productType = $lead->get('cInterestedProductType') ?? 'Unknown';
            
            // Initialize group if not exists
            $groupKey = $segmentKey . '|' . $productType;
            
            if (!isset($groupedData[$groupKey])) {
                $groupedData[$groupKey] = [
                    'customerSegment' => $segmentKey,
                    'productType' => $productType,
                    'totalLeads' => 0,
                    'convertedLeads' => 0,
                ];
            }
            
            // Count total leads
            $groupedData[$groupKey]['totalLeads']++;
            
            // Count converted leads
            if ($lead->get('status') === 'Converted') {
                $groupedData[$groupKey]['convertedLeads']++;
            }
        }
        
        // Calculate conversion rates and format result
        $result = new stdClass();
        $result->type = 'Grid';
        $result->columns = [
            (object)['name' => 'customerSegment', 'label' => 'Customer Segment'],
            (object)['name' => 'productType', 'label' => 'Product Type'],
            (object)['name' => 'totalLeads', 'label' => 'Total Leads', 'type' => 'int'],
            (object)['name' => 'convertedLeads', 'label' => 'Converted Leads', 'type' => 'int'],
            (object)['name' => 'conversionRate', 'label' => 'Conversion Rate', 'type' => 'float'],
        ];
        
        $result->data = [];
        
        foreach ($groupedData as $group) {
            $conversionRate = $group['totalLeads'] > 0 
                ? round(($group['convertedLeads'] / $group['totalLeads']) * 100, 2)
                : 0;
            
            $result->data[] = (object)[
                'customerSegment' => $group['customerSegment'],
                'productType' => $group['productType'],
                'totalLeads' => $group['totalLeads'],
                'convertedLeads' => $group['convertedLeads'],
                'conversionRate' => $conversionRate,
            ];
        }
        
        // Sort by Customer Segment, then Product Type
        usort($result->data, function($a, $b) {
            $segmentCompare = strcmp($a->customerSegment, $b->customerSegment);
            if ($segmentCompare !== 0) {
                return $segmentCompare;
            }
            return strcmp($a->productType, $b->productType);
        });
        
        return $result;
    }
    
    /**
     * Normalize customer segment to "New" or "Existing"
     */
    private function normalizeSegment(string $segment): string
    {
        if (stripos($segment, 'New') !== false) {
            return 'New';
        }
        
        if (stripos($segment, 'Existing') !== false || 
            stripos($segment, 'Returning') !== false ||
            stripos($segment, 'Dormant') !== false) {
            return 'Existing';
        }
        
        return 'New'; // Default to New if unknown
    }
}


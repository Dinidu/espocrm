<?php

namespace Espo\Custom\Services;

use Espo\Services\Report as BaseReport;
use stdClass;

class Report extends BaseReport
{
    /**
     * Override to handle custom report types
     */
    public function run(string $id, ?stdClass $params = null): stdClass
    {
        $report = $this->getEntity($id);
        
        if (!$report) {
            throw new \Espo\Core\Exceptions\NotFound("Report not found.");
        }
        
        // Check if it's our custom report type
        if ($report->get('type') === 'NewVsExistingClientLead') {
            return $this->runCustomReport($report, $params);
        }
        
        // Fall back to parent implementation for other report types
        return parent::run($id, $params);
    }
    
    private function runCustomReport($report, ?stdClass $params): stdClass
    {
        $handlerClassName = $this->metadata->get(['reportTypes', 'NewVsExistingClientLead', 'handlerClassName']);
        
        if (!$handlerClassName) {
            throw new \Espo\Core\Exceptions\Error("Report handler not found.");
        }
        
        $handler = $this->injectableFactory->create($handlerClassName);
        
        $data = $report->get('data') ?: (object)[];
        $params = $params ?: (object)[];
        
        return $handler->run($data, $params);
    }
}

